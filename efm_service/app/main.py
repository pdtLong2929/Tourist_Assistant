import sys
import numpy
import types

if not hasattr(numpy, "_core"):
    # 1. Create a virtual _core module
    _core = types.ModuleType('numpy._core')
    
    # 2. Map critical attributes from old core to the new _core
    _core.numeric = numpy.core.numeric
    _core.multiarray = numpy.core.multiarray
    _core.umath = numpy.core.umath
    _core.numerictypes = numpy.core.numerictypes
    
   # 3. Register it into sys.modules as a Package
    _core.__path__ = [] 
    sys.modules['numpy._core'] = _core
    sys.modules['numpy._core.numeric'] = numpy.core.numeric
    sys.modules['numpy._core.multiarray'] = numpy.core.multiarray
    
    print("NumPy compatibility patch activated.")

from fastapi import FastAPI
from app.services.efm_logic import load_resources
from app.routers import efm_router

app = FastAPI(title="Tourist Assistant AI - EFM Service", version="1.1")

@app.on_event("startup")
async def startup_event():
    load_resources()

# Mount the EFM router
app.include_router(efm_router.router)

@app.get("/")
def health_check():
    return {"status": "online", "service": "EFM Recommender"}