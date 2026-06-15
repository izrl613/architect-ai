from google.antigravity import LocalAgentConfig, types
from .agents.researcher import researcher_config
from .agents.responder import responder_config

root_config = LocalAgentConfig(
    model='gemma-4-e4b',
    capabilities=types.CapabilitiesConfig(
        enable_subagents=True,
    ),
    system_instructions='A multi-agent pipeline: researcher gathers information, responder formulates the reply.',
)
