conversation_sessions = {}


def get_session(user_id):

    if user_id not in conversation_sessions:

        conversation_sessions[user_id] = {
            "context": [],
            "last_question": None,
            "last_prediction": None
        }

    return conversation_sessions[user_id]


def update_context(user_id, user_message):

    session = get_session(user_id)

    session["context"].append(user_message)

    # chỉ giữ 5 messages gần nhất
    session["context"] = session["context"][-5:]


def set_last_question(user_id, question):

    session = get_session(user_id)

    session["last_question"] = question


def get_last_question(user_id):

    session = get_session(user_id)

    return session["last_question"]


def set_prediction(user_id, prediction):

    session = get_session(user_id)

    session["last_prediction"] = prediction


def get_prediction(user_id):

    session = get_session(user_id)

    return session["last_prediction"]