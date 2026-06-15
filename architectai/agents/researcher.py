from google.antigravity import LocalAgentConfig

researcher_config = LocalAgentConfig(
    model='gemma-4-e4b',
    system_instructions=(
        'Researches the topic and stores findings in session state.\n'
        'Analyze the user request thoroughly. '
        'Store key findings in state["research_results"] for the next agent to use.'
    )
)
