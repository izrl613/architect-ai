from google.antigravity import LocalAgentConfig

responder_config = LocalAgentConfig(
    model='gemma-4-e4b',
    system_instructions=(
        'Formulates the final response using research findings from state.\n'
        'Read state["research_results"] and use those findings to write '
        'a clear, concise response for the user.'
    )
)
