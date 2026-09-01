import importlib.util
from pathlib import Path

root_server = Path('/app/server.py')
spec = importlib.util.spec_from_file_location('luma_root_server', root_server)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
app = module.app