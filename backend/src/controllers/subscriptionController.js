const db = require('../config/db');

const promiseDb = db.promise();

const PACKAGE_MAP = {
  VERIFIED: {
    name: 'VERIFIED',
    price: 500000,
    job_delay_minutes: 30,
    monthly_promotion_limit: 0,
  },
  PREMIUM: {
    name: 'PREMIUM',
    price: 1000000,
    job_delay_minutes: 0,
    monthly_promotion_limit: 10,
  },
  FREE: {
    name: 'FREE',
    price: 0,
    job_delay_minutes: 60,
    monthly_promotion_limit: 0,
  },
};

let promotionSchemaReady = false;
let promotionSchemaPromise = null;
let dueCampaignProcessorRunning = false;
let schedulerStarted = false;

const normalizeString = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

const normalizeDateTime = (value) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
};

const getPromotionLimitByPackage = (packageName) => {
  const pkg = PACKAGE_MAP[packageName] || PACKAGE_MAP.FREE;
  return Number(pkg.monthly_promotion_limit || 0);
};

const ensureColumn = async (tableName, columnName, definitionSql) => {
  const [rows] = await promiseDb.query(`SHOW COLUMNS FROM ${tableName} LIKE ?`, [columnName]);
  if (!rows.length) {
    await promiseDb.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definitionSql}`);
  }
};

const ensurePromotionSchema = async () => {
  if (promotionSchemaReady) return;
  if (promotionSchemaPromise) {
    await promotionSchemaPromise;
    return;
  }

  promotionSchemaPromise = (async () => {
    await promiseDb.query(`
      CREATE TABLE IF NOT EXISTS promotion_campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        store_id INT NOT NULL,
        requested_by INT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status ENUM(
          'PENDING_APPROVAL',
          'APPROVED',
          'SCHEDULED',
          'SENDING',
          'SENT',
          'REJECTED',
          'FAILED'
        ) NOT NULL DEFAULT 'PENDING_APPROVAL',
        scheduled_at DATETIME NULL,
        monthly_limit_snapshot INT NOT NULL DEFAULT 0,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approved_by INT NULL,
        approved_at DATETIME NULL,
        rejected_reason TEXT NULL,
        sent_at DATETIME NULL,
        recipients_count INT NOT NULL DEFAULT 0,
        last_error TEXT NULL,
        CONSTRAINT fk_promo_campaign_store FOREIGN KEY (store_id) REFERENCES stores(id),
        CONSTRAINT fk_promo_campaign_requester FOREIGN KEY (requested_by) REFERENCES users(id),
        CONSTRAINT fk_promo_campaign_approver FOREIGN KEY (approved_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await promiseDb.query(`
      CREATE TABLE IF NOT EXISTS promotion_campaign_recipients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        campaign_id INT NOT NULL,
        user_id INT NOT NULL,
        notification_id INT NULL,
        delivered_at DATETIME NULL,
        opened_at DATETIME NULL,
        clicked_at DATETIME NULL,
        CONSTRAINT fk_promo_recipient_campaign FOREIGN KEY (campaign_id) REFERENCES promotion_campaigns(id) ON DELETE CASCADE,
        CONSTRAINT fk_promo_recipient_user FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE KEY uk_promo_recipient_campaign_user (campaign_id, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await ensureColumn('notifications', 'campaign_id', 'INT NULL AFTER sender_id');
    await ensureColumn('notifications', 'target_page', 'VARCHAR(50) NULL AFTER campaign_id');
    await ensureColumn('notifications', 'related_request_id', 'INT NULL AFTER target_page');

    promotionSchemaReady = true;
  })();

  try {
    await promotionSchemaPromise;
  } finally {
    promotionSchemaPromise = null;
  }
};

const getOrCreateSubscriptionId = async (packageName) => {
  const pkg = PACKAGE_MAP[packageName] || PACKAGE_MAP.FREE;
  const [rows] = await promiseDb.query(
    'SELECT id FROM subscriptions WHERE name = ? LIMIT 1',
    [pkg.name]
  );

  if (rows.length > 0) {
    return { id: rows[0].id, pkg };
  }

  const [result] = await promiseDb.query(
    'INSERT INTO subscriptions (name, price, job_delay_minutes) VALUES (?, ?, ?)',
    [pkg.name, pkg.price, pkg.job_delay_minutes]
  );

  return { id: result.insertId, pkg };
};

const getStoreByUserId = async (userId) => {
  const [rows] = await promiseDb.query(
    'SELECT id, user_id, store_name FROM stores WHERE user_id = ? LIMIT 1',
    [userId]
  );

  return rows.length > 0 ? rows[0] : null;
};

const getActivePackageByStoreId = async (storeId) => {
  const [rows] = await promiseDb.query(
    `
    SELECT
      ss.*,
      s.name AS package_name,
      s.price,
      s.job_delay_minutes
    FROM store_subscriptions ss
    INNER JOIN subscriptions s ON s.id = ss.subscription_id
    WHERE ss.store_id = ?
      AND (ss.end_date IS NULL OR ss.end_date >= CURDATE())
    ORDER BY COALESCE(ss.end_date, '9999-12-31') DESC, ss.id DESC
    LIMIT 1
    `,
    [storeId]
  );

  return rows.length > 0 ? rows[0] : null;
};

const getCampaignUsageThisMonth = async (storeId) => {
  await ensurePromotionSchema();

  const [rows] = await promiseDb.query(
    `
    SELECT COUNT(*) AS total
    FROM promotion_campaigns
    WHERE store_id = ?
      AND DATE_FORMAT(requested_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
      AND status <> 'REJECTED'
    `,
    [storeId]
  );

  return Number(rows[0]?.total || 0);
};

const mapCampaignRow = (item) => ({
  id: item.id,
  title: item.title,
  message: item.message,
  status: item.status,
  scheduledAt: item.scheduled_at,
  requestedAt: item.requested_at,
  approvedAt: item.approved_at,
  sentAt: item.sent_at,
  rejectedReason: item.rejected_reason,
  recipients: Number(item.recipientsCount || 0),
  opened: Number(item.openedCount || 0),
  clicked: Number(item.clickedCount || 0),
  openRate:
    Number(item.recipientsCount || 0) > 0
      ? Math.round((Number(item.openedCount || 0) / Number(item.recipientsCount || 0)) * 100)
      : 0,
  clickRate:
    Number(item.recipientsCount || 0) > 0
      ? Math.round((Number(item.clickedCount || 0) / Number(item.recipientsCount || 0)) * 100)
      : 0,
  approvedByName: item.approvedByName || null,
  storeName: item.store_name || null,
  ownerName: item.ownerName || null,
  monthlyLimitSnapshot: Number(item.monthly_limit_snapshot || 0),
  lastError: item.last_error || null,
});

const getStorePromotionOverviewData = async (userId) => {
  await ensurePromotionSchema();

  const store = await getStoreByUserId(userId);
  if (!store) return null;

  const activePackage = await getActivePackageByStoreId(store.id);
  const packageName = activePackage?.package_name || 'FREE';
  const monthlyLimit = getPromotionLimitByPackage(packageName);
  const usedThisMonth = await getCampaignUsageThisMonth(store.id);

  const [campaignRows] = await promiseDb.query(
    `
    SELECT
      pc.*,
      approver.name AS approvedByName,
      COUNT(pcr.id) AS recipientsCount,
      SUM(CASE WHEN pcr.opened_at IS NOT NULL THEN 1 ELSE 0 END) AS openedCount,
      SUM(CASE WHEN pcr.clicked_at IS NOT NULL THEN 1 ELSE 0 END) AS clickedCount
    FROM promotion_campaigns pc
    LEFT JOIN promotion_campaign_recipients pcr ON pcr.campaign_id = pc.id
    LEFT JOIN users approver ON approver.id = pc.approved_by
    WHERE pc.store_id = ?
    GROUP BY pc.id
    ORDER BY pc.requested_at DESC
    LIMIT 20
    `,
    [store.id]
  );

  const [summaryRows] = await promiseDb.query(
    `
    SELECT
      COUNT(*) AS totalCampaigns,
      SUM(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 ELSE 0 END) AS pendingApprovals,
      SUM(CASE WHEN status = 'SCHEDULED' THEN 1 ELSE 0 END) AS scheduledCampaigns,
      SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) AS sentCampaigns
    FROM promotion_campaigns
    WHERE store_id = ?
    `,
    [store.id]
  );

  return {
    packageName,
    monthlyLimit,
    usedThisMonth,
    remainingThisMonth: Math.max(monthlyLimit - usedThisMonth, 0),
    summary: {
      totalCampaigns: Number(summaryRows[0]?.totalCampaigns || 0),
      pendingApprovals: Number(summaryRows[0]?.pendingApprovals || 0),
      scheduledCampaigns: Number(summaryRows[0]?.scheduledCampaigns || 0),
      sentCampaigns: Number(summaryRows[0]?.sentCampaigns || 0),
    },
    campaigns: campaignRows.map(mapCampaignRow),
  };
};

const deliverCampaign = async (campaignId) => {
  await ensurePromotionSchema();

  const [campaignRows] = await promiseDb.query(
    `
    SELECT
      pc.*,
      s.store_name,
      s.user_id AS store_user_id
    FROM promotion_campaigns pc
    INNER JOIN stores s ON s.id = pc.store_id
    WHERE pc.id = ?
    LIMIT 1
    `,
    [campaignId]
  );

  if (!campaignRows.length) {
    throw new Error('Không tìm thấy chiến dịch ưu đãi');
  }

  const campaign = campaignRows[0];
  if (!['APPROVED', 'SCHEDULED'].includes(campaign.status)) {
    return { skipped: true, reason: `Campaign status = ${campaign.status}` };
  }

  const [lockResult] = await promiseDb.query(
    `
    UPDATE promotion_campaigns
    SET status = 'SENDING', last_error = NULL
    WHERE id = ? AND status IN ('APPROVED', 'SCHEDULED')
    `,
    [campaignId]
  );

  if (!lockResult.affectedRows) {
    return { skipped: true, reason: 'Campaign is already being processed' };
  }

  try {
    const [users] = await promiseDb.query(
      `
      SELECT id
      FROM users
      WHERE role = 'USER'
        AND (status IS NULL OR status <> 'BLOCKED')
      ORDER BY id ASC
      `
    );

    if (!users.length) {
      await promiseDb.query(
        `
        UPDATE promotion_campaigns
        SET status = 'SENT', sent_at = NOW(), recipients_count = 0
        WHERE id = ?
        `,
        [campaignId]
      );

      return { recipients: 0 };
    }

    const notificationValues = users.map((user) => [
      user.id,
      campaign.store_user_id,
      campaign.id,
      campaign.title,
      `[${campaign.store_name}] ${campaign.message}`,
      'SYSTEM',
      'stores',
      null,
    ]);

    const [notificationResult] = await promiseDb.query(
      `
      INSERT INTO notifications (
        user_id,
        sender_id,
        campaign_id,
        title,
        message,
        type,
        target_page,
        related_request_id
      ) VALUES ?
      `,
      [notificationValues]
    );

    const firstNotificationId = Number(notificationResult.insertId || 0);
    const notificationIds = users.map((_, index) => firstNotificationId + index);

    const recipientValues = users.map((user, index) => [
      campaign.id,
      user.id,
      notificationIds[index],
      normalizeDateTime(new Date()),
      null,
      null,
    ]);

    await promiseDb.query(
      `
      INSERT INTO promotion_campaign_recipients (
        campaign_id,
        user_id,
        notification_id,
        delivered_at,
        opened_at,
        clicked_at
      ) VALUES ?
      `,
      [recipientValues]
    );

    await promiseDb.query(
      `
      UPDATE promotion_campaigns
      SET status = 'SENT', sent_at = NOW(), recipients_count = ?, last_error = NULL
      WHERE id = ?
      `,
      [users.length, campaign.id]
    );

    return { recipients: users.length };
  } catch (error) {
    await promiseDb.query(
      `
      UPDATE promotion_campaigns
      SET status = 'FAILED', last_error = ?
      WHERE id = ?
      `,
      [error.message, campaign.id]
    );

    throw error;
  }
};

const processDueCampaigns = async () => {
  if (dueCampaignProcessorRunning) return;

  dueCampaignProcessorRunning = true;

  try {
    await ensurePromotionSchema();

    const [rows] = await promiseDb.query(
      `
      SELECT id
      FROM promotion_campaigns
      WHERE status IN ('APPROVED', 'SCHEDULED')
        AND (scheduled_at IS NULL OR scheduled_at <= NOW())
      ORDER BY COALESCE(scheduled_at, requested_at) ASC
      LIMIT 20
      `
    );

    for (const row of rows) {
      try {
        await deliverCampaign(row.id);
      } catch (error) {
        console.error('deliverCampaign error:', error.message);
      }
    }
  } catch (error) {
    console.error('processDueCampaigns error:', error.message);
  } finally {
    dueCampaignProcessorRunning = false;
  }
};

const startCampaignScheduler = () => {
  if (schedulerStarted) return;
  schedulerStarted = true;

  ensurePromotionSchema()
    .then(() => processDueCampaigns())
    .catch((error) => console.error('Promotion schema init error:', error.message));

  setInterval(() => {
    processDueCampaigns().catch((error) => {
      console.error('Promotion scheduler error:', error.message);
    });
  }, 30000);
};

startCampaignScheduler();

exports.ensurePromotionSchema = ensurePromotionSchema;

exports.getSubscription = async (req, res) => {
  try {
    const userId = req.params.userId;
    const store = await getStoreByUserId(userId);

    if (!store) {
      return res.status(200).json(null);
    }

    const activePackage = await getActivePackageByStoreId(store.id);
    return res.status(200).json(activePackage);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.upgradeSubscription = async (req, res) => {
  try {
    const {
      userId,
      packageName,
      durationDays,
      paymentMethod,
      paymentType,
      isMockPayment,
    } = req.body;

    if (!userId || !packageName) {
      return res.status(400).json({ error: 'Thiếu userId hoặc packageName' });
    }

    const selectedPackage = PACKAGE_MAP[packageName];
    if (!selectedPackage) {
      return res.status(400).json({ error: 'Gói không hợp lệ' });
    }

    const store = await getStoreByUserId(userId);
    if (!store) {
      return res.status(404).json({ error: 'Không tìm thấy cửa hàng của user này' });
    }

    const { id: subscriptionId, pkg } = await getOrCreateSubscriptionId(packageName);

    const days = Number(durationDays || 30);
    const startDate = new Date().toISOString().slice(0, 10);
    const endDateObj = new Date();
    endDateObj.setDate(endDateObj.getDate() + days);
    const endDate = endDateObj.toISOString().slice(0, 10);

    const method = paymentMethod || 'VNPAY';
    const type = paymentType || 'FULL';
    const transactionCode = `TEST-${packageName}-${Date.now()}`;
    const paymentStatus = isMockPayment === false ? 'PENDING' : 'PAID';

    const [paymentResult] = await promiseDb.query(
      `
      INSERT INTO payments (
        order_id,
        user_id,
        store_id,
        amount,
        payment_method,
        payment_type,
        status,
        transaction_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [null, userId, store.id, pkg.price, method, type, paymentStatus, transactionCode]
    );

    if (paymentStatus !== 'PAID') {
      return res.status(200).json({
        message: 'Đã tạo giao dịch chờ thanh toán',
        payment_id: paymentResult.insertId,
        package_name: packageName,
        payment_status: paymentStatus,
      });
    }

    const [subscriptionRows] = await promiseDb.query(
      'SELECT id FROM store_subscriptions WHERE store_id = ? LIMIT 1',
      [store.id]
    );

    if (subscriptionRows.length > 0) {
      await promiseDb.query(
        `
        UPDATE store_subscriptions
        SET subscription_id = ?, start_date = ?, end_date = ?
        WHERE store_id = ?
        `,
        [subscriptionId, startDate, endDate, store.id]
      );
    } else {
      await promiseDb.query(
        `
        INSERT INTO store_subscriptions (store_id, subscription_id, start_date, end_date)
        VALUES (?, ?, ?, ?)
        `,
        [store.id, subscriptionId, startDate, endDate]
      );
    }

    await promiseDb.query(
      `
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, 'PAYMENT')
      `,
      [
        userId,
        'Thanh toán gói quảng bá thành công',
        `Cửa hàng của bạn đã thanh toán thành công gói ${packageName}. Mã giao dịch: ${transactionCode}.`,
      ]
    );

    return res.status(200).json({
      message: 'Thanh toán ảo thành công và đã nâng cấp gói!',
      package_name: packageName,
      payment_id: paymentResult.insertId,
      payment_status: paymentStatus,
      transaction_code: transactionCode,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.broadcastPromotion = async (req, res) => {
  try {
    await ensurePromotionSchema();

    const userId = req.user?.id;
    const title = normalizeString(req.body?.title);
    const message = normalizeString(req.body?.message);
    const scheduledAtInput = normalizeString(req.body?.scheduledAt);
    const scheduledAt = scheduledAtInput ? normalizeDateTime(scheduledAtInput) : null;

    if (!userId) {
      return res.status(401).json({ error: 'Bạn chưa đăng nhập' });
    }

    if (!title || !message) {
      return res.status(400).json({ error: 'Vui lòng nhập tiêu đề và nội dung ưu đãi' });
    }

    if (scheduledAtInput && !scheduledAt) {
      return res.status(400).json({ error: 'Thời gian hẹn gửi không hợp lệ' });
    }

    const store = await getStoreByUserId(userId);
    if (!store) {
      return res.status(404).json({ error: 'Không tìm thấy cửa hàng của bạn' });
    }

    const activePackage = await getActivePackageByStoreId(store.id);
    const packageName = activePackage?.package_name || 'FREE';

    if (packageName !== 'PREMIUM') {
      return res.status(403).json({
        error: 'Chỉ gói PREMIUM mới được gửi yêu cầu ưu đãi đến toàn bộ User',
      });
    }

    const monthlyLimit = getPromotionLimitByPackage(packageName);
    const usedThisMonth = await getCampaignUsageThisMonth(store.id);

    if (usedThisMonth >= monthlyLimit) {
      return res.status(400).json({
        error: `Bạn đã dùng hết ${monthlyLimit} lượt gửi ưu đãi trong tháng này`,
        monthlyLimit,
        usedThisMonth,
        remainingThisMonth: 0,
      });
    }

    const [result] = await promiseDb.query(
      `
      INSERT INTO promotion_campaigns (
        store_id,
        requested_by,
        title,
        message,
        status,
        scheduled_at,
        monthly_limit_snapshot
      ) VALUES (?, ?, ?, ?, 'PENDING_APPROVAL', ?, ?)
      `,
      [store.id, userId, title, message, scheduledAt, monthlyLimit]
    );

    await promiseDb.query(
      `
      INSERT INTO notifications (user_id, sender_id, title, message, type, target_page)
      VALUES (?, ?, ?, ?, 'SYSTEM', 'home')
      `,
      [
        userId,
        userId,
        'Đã tạo yêu cầu duyệt ưu đãi',
        scheduledAt
          ? `Chiến dịch "${title}" đã được gửi admin duyệt và hẹn phát lúc ${scheduledAt}.`
          : `Chiến dịch "${title}" đã được gửi admin duyệt. Sau khi được duyệt hệ thống sẽ gửi đến user.`,
      ]
    );

    return res.status(200).json({
      message: 'Đã gửi admin duyệt nội dung quảng bá',
      campaignId: result.insertId,
      status: 'PENDING_APPROVAL',
      monthlyLimit,
      usedThisMonth: usedThisMonth + 1,
      remainingThisMonth: Math.max(monthlyLimit - usedThisMonth - 1, 0),
      scheduledAt,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getPromotionOverview = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Bạn chưa đăng nhập' });
    }

    const data = await getStorePromotionOverviewData(userId);
    if (!data) {
      return res.status(404).json({ error: 'Không tìm thấy cửa hàng của bạn' });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getAdminPromotionCampaigns = async (req, res) => {
  try {
    await ensurePromotionSchema();

    const [rows] = await promiseDb.query(
      `
      SELECT
        pc.*,
        s.store_name,
        owner.name AS ownerName,
        approver.name AS approvedByName,
        COUNT(pcr.id) AS recipientsCount,
        SUM(CASE WHEN pcr.opened_at IS NOT NULL THEN 1 ELSE 0 END) AS openedCount,
        SUM(CASE WHEN pcr.clicked_at IS NOT NULL THEN 1 ELSE 0 END) AS clickedCount
      FROM promotion_campaigns pc
      INNER JOIN stores s ON s.id = pc.store_id
      LEFT JOIN users owner ON owner.id = s.user_id
      LEFT JOIN users approver ON approver.id = pc.approved_by
      LEFT JOIN promotion_campaign_recipients pcr ON pcr.campaign_id = pc.id
      GROUP BY pc.id
      ORDER BY
        CASE pc.status
          WHEN 'PENDING_APPROVAL' THEN 0
          WHEN 'SCHEDULED' THEN 1
          WHEN 'APPROVED' THEN 2
          WHEN 'SENT' THEN 3
          WHEN 'FAILED' THEN 4
          WHEN 'REJECTED' THEN 5
          ELSE 6
        END,
        pc.requested_at DESC
      LIMIT 100
      `
    );

    const [summaryRows] = await promiseDb.query(
      `
      SELECT
        SUM(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 ELSE 0 END) AS pendingApprovals,
        SUM(CASE WHEN status = 'SCHEDULED' THEN 1 ELSE 0 END) AS scheduledCampaigns,
        SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) AS sentCampaigns,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failedCampaigns,
        COALESCE(SUM(recipients_count), 0) AS deliveredTotal
      FROM promotion_campaigns
      `
    );

    const campaignList = rows.map(mapCampaignRow);

    return res.status(200).json({
      summary: {
        pendingApprovals: Number(summaryRows[0]?.pendingApprovals || 0),
        scheduledCampaigns: Number(summaryRows[0]?.scheduledCampaigns || 0),
        sentCampaigns: Number(summaryRows[0]?.sentCampaigns || 0),
        failedCampaigns: Number(summaryRows[0]?.failedCampaigns || 0),
        deliveredTotal: Number(summaryRows[0]?.deliveredTotal || 0),
        openedTotal: campaignList.reduce((sum, item) => sum + Number(item.opened || 0), 0),
        clickedTotal: campaignList.reduce((sum, item) => sum + Number(item.clicked || 0), 0),
      },
      campaigns: campaignList,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.approvePromotionCampaign = async (req, res) => {
  try {
    await ensurePromotionSchema();

    const campaignId = Number(req.params.id);
    const adminUserId = Number(req.body?.adminUserId || 0) || null;

    if (!campaignId) {
      return res.status(400).json({ error: 'Thiếu mã chiến dịch' });
    }

    const [rows] = await promiseDb.query(
      'SELECT id, status, scheduled_at FROM promotion_campaigns WHERE id = ? LIMIT 1',
      [campaignId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Không tìm thấy chiến dịch quảng bá' });
    }

    const campaign = rows[0];
    if (campaign.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'Chiến dịch này không còn ở trạng thái chờ duyệt' });
    }

    const shouldSchedule = campaign.scheduled_at && new Date(campaign.scheduled_at) > new Date();
    const nextStatus = shouldSchedule ? 'SCHEDULED' : 'APPROVED';

    await promiseDb.query(
      `
      UPDATE promotion_campaigns
      SET status = ?, approved_by = ?, approved_at = NOW(), rejected_reason = NULL, last_error = NULL
      WHERE id = ?
      `,
      [nextStatus, adminUserId, campaignId]
    );

    if (nextStatus === 'APPROVED') {
      await processDueCampaigns();
    }

    return res.status(200).json({
      message: shouldSchedule
        ? 'Đã duyệt và lên lịch gửi ưu đãi'
        : 'Đã duyệt và bắt đầu gửi ưu đãi',
      status: nextStatus,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.rejectPromotionCampaign = async (req, res) => {
  try {
    await ensurePromotionSchema();

    const campaignId = Number(req.params.id);
    const rejectedReason = normalizeString(req.body?.reason) || 'Nội dung chưa phù hợp';

    if (!campaignId) {
      return res.status(400).json({ error: 'Thiếu mã chiến dịch' });
    }

    const [rows] = await promiseDb.query(
      'SELECT id, status FROM promotion_campaigns WHERE id = ? LIMIT 1',
      [campaignId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Không tìm thấy chiến dịch quảng bá' });
    }

    if (rows[0].status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'Chỉ có thể từ chối chiến dịch đang chờ duyệt' });
    }

    await promiseDb.query(
      `
      UPDATE promotion_campaigns
      SET status = 'REJECTED', rejected_reason = ?, approved_at = NULL, approved_by = NULL
      WHERE id = ?
      `,
      [rejectedReason, campaignId]
    );

    return res.status(200).json({
      message: 'Đã từ chối chiến dịch quảng bá',
      status: 'REJECTED',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.trackPromotionOpenByNotification = async (notificationId, userId) => {
  if (!notificationId || !userId) return;

  await ensurePromotionSchema();

  const [rows] = await promiseDb.query(
    `
    SELECT id, campaign_id
    FROM notifications
    WHERE id = ? AND user_id = ? AND campaign_id IS NOT NULL
    LIMIT 1
    `,
    [notificationId, userId]
  );

  if (!rows.length) return;

  await promiseDb.query(
    `
    UPDATE promotion_campaign_recipients
    SET opened_at = COALESCE(opened_at, NOW())
    WHERE notification_id = ? AND user_id = ?
    `,
    [notificationId, userId]
  );
};

exports.trackPromotionClickByNotification = async (notificationId, userId) => {
  if (!notificationId || !userId) return;

  await ensurePromotionSchema();

  const [rows] = await promiseDb.query(
    `
    SELECT id, campaign_id
    FROM notifications
    WHERE id = ? AND user_id = ? AND campaign_id IS NOT NULL
    LIMIT 1
    `,
    [notificationId, userId]
  );

  if (!rows.length) return { tracked: false };

  await promiseDb.query(
    `
    UPDATE promotion_campaign_recipients
    SET
      opened_at = COALESCE(opened_at, NOW()),
      clicked_at = COALESCE(clicked_at, NOW())
    WHERE notification_id = ? AND user_id = ?
    `,
    [notificationId, userId]
  );

  return { tracked: true };
};

exports.trackAllPromotionNotificationsOpened = async (userId) => {
  if (!userId) return;

  await ensurePromotionSchema();

  await promiseDb.query(
    `
    UPDATE promotion_campaign_recipients pcr
    INNER JOIN notifications n ON n.id = pcr.notification_id
    SET pcr.opened_at = COALESCE(pcr.opened_at, NOW())
    WHERE n.user_id = ?
      AND n.is_read = 0
      AND n.campaign_id IS NOT NULL
      AND pcr.opened_at IS NULL
    `,
    [userId]
  );
};
