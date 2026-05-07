conversation_memory = {}


def save_context(user_id, symptom, issue=None):

    conversation_memory[user_id] = {

        "symptom": symptom,

        "issue": issue,

        "answers": {},

        "current_step": 0
    }


def get_context(user_id):
    return conversation_memory.get(user_id)


def clear_context(user_id):
    if user_id in conversation_memory:
        del conversation_memory[user_id]
        
def update_answer(user_id, key, value):

    if user_id in conversation_memory:

        conversation_memory[user_id]["answers"][key] = value


def next_step(user_id):

    if user_id in conversation_memory:

        conversation_memory[user_id]["current_step"] += 1


def get_step(user_id):

    if user_id in conversation_memory:

        return conversation_memory[user_id]["current_step"]

    return 0