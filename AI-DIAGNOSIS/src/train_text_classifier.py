import os
import numpy as np
import pandas as pd
from datasets import Dataset, DatasetDict
import evaluate
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer
)

from label_map import label2id, id2label

MODEL_NAME = "xlm-roberta-base"
# <<<<<<< Updated upstream
DATA_DIR = "D:/CAPSTONE2/new/IEMS-PLATFORM/AI-DIAGNOSIS/data/laptop/splits"
OUTPUT_DIR = "D:/CAPSTONE2/new/IEMS-PLATFORM/AI-DIAGNOSIS/models/text_baseline"
# =======
# DATA_DIR = "D:/CAPSTONE2/dev3/AI-DIAGNOSIS/data/laptop/splits"
# OUTPUT_DIR = "D:/CAPSTONE2/dev3/AI-DIAGNOSIS/models/text_baseline"
# >>>>>>> Stashed changes
MAX_LENGTH = 128


def load_data():
    train_df = pd.read_csv(os.path.join(DATA_DIR, "train.csv"))
    val_df = pd.read_csv(os.path.join(DATA_DIR, "val.csv"))
    test_df = pd.read_csv(os.path.join(DATA_DIR, "test.csv"))

    train_dataset = Dataset.from_pandas(train_df[["symptom_text", "labels"]], preserve_index=False)
    val_dataset = Dataset.from_pandas(val_df[["symptom_text", "labels"]], preserve_index=False)
    test_dataset = Dataset.from_pandas(test_df[["symptom_text", "labels"]], preserve_index=False)

    dataset = DatasetDict({
        "train": train_dataset,
        "validation": val_dataset,
        "test": test_dataset
    })

    return dataset


def tokenize_function(examples, tokenizer):
    return tokenizer(
        examples["symptom_text"],
        truncation=True,
        padding="max_length",
        max_length=MAX_LENGTH
    )


def compute_metrics(eval_pred):
    accuracy_metric = evaluate.load("accuracy")
    precision_metric = evaluate.load("precision")
    recall_metric = evaluate.load("recall")
    f1_metric = evaluate.load("f1")

    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)

    accuracy = accuracy_metric.compute(predictions=predictions, references=labels)
    precision = precision_metric.compute(predictions=predictions, references=labels, average="weighted")
    recall = recall_metric.compute(predictions=predictions, references=labels, average="weighted")
    f1 = f1_metric.compute(predictions=predictions, references=labels, average="weighted")

    return {
        "accuracy": accuracy["accuracy"],
        "precision": precision["precision"],
        "recall": recall["recall"],
        "f1": f1["f1"]
    }


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    dataset = load_data()
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

    tokenized_dataset = dataset.map(
        lambda examples: tokenize_function(examples, tokenizer),
        batched=True
    )

    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_NAME,
        num_labels=len(label2id),
        id2label=id2label,
        label2id=label2id
    )

    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        eval_strategy="epoch",
        save_strategy="epoch",
        logging_strategy="epoch",
        learning_rate=5e-5,
        per_device_train_batch_size=4,
        per_device_eval_batch_size=8,
        num_train_epochs=8,
        weight_decay=0.01,
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        greater_is_better=True,
        save_total_limit=2,
        report_to="none"
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset["train"],
        eval_dataset=tokenized_dataset["validation"],
        processing_class=tokenizer,
        compute_metrics=compute_metrics
    )

    trainer.train()

    print("\n===== VALIDATION RESULT =====")
    val_result = trainer.evaluate(tokenized_dataset["validation"])
    print(val_result)

    print("\n===== TEST RESULT =====")
    test_result = trainer.evaluate(tokenized_dataset["test"])
    print(test_result)

    trainer.save_model(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)

    print(f"\nModel saved to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()