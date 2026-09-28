import os
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, Query
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from fastapi.staticfiles import StaticFiles

from schemas import (
    OptimizeRequest,
    OptimizeResponse,
    CityResponse,
    TradeoffResponse
)
from solver import GridpointSolver

# Determine data paths relative to project root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
candidate_paths = [
    os.path.join(BASE_DIR, "City data", "bangalore_data_normalized.csv"),
    os.path.join(BASE_DIR, "City data", "bangalore_data_normalize.csv"),
    os.path.join(BASE_DIR, "City data", "bangalore_data.csv"),
]
DATA_PATH = next((p for p in candidate_paths if os.path.exists(p)), candidate_paths[0])
LOCALITY_PATH = os.path.join(BASE_DIR, "City data", "prices", "bangalore_locality_prices.csv")

# Eager startup initialization
print("[GRIDPOINT] Loading Discrete Spatial Solver...")
print(f"  Dataset: {DATA_PATH}")
print(f"  Localities: {LOCALITY_PATH}")
solver = GridpointSolver(DATA_PATH, LOCALITY_PATH)
print(f"[GRIDPOINT] Ready! 800 discrete candidate nodes loaded ({solver.total_orders:,.0f} orders/day).")

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

# Initialize FastAPI application
app = FastAPI(
    title="GRIDPOINT — Bangalore Warehouse Spatial Optimization API",
    description="Discrete Capacitated Facility Location Solver with Spatial Dispersion Constraints",
    version="2.0.0",
    lifespan=lifespan
)

# Enable CORS for all frontends (React, Vite, Next.js, Leaflet)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount React Frontend Dashboard if compiled
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    data_dir = os.path.join(FRONTEND_DIST, "data")
    if os.path.exists(data_dir):
        app.mount("/data", StaticFiles(directory=data_dir), name="data")
    app.mount("/dashboard", StaticFiles(directory=FRONTEND_DIST, html=True), name="dashboard")

@app.get("/health", summary="Health Check")
@app.get("/api/health", summary="API Health Check")
def health_check():
    return {
        "status": "online",
        "service": "GRIDPOINT Discrete Spatial Optimization API",
        "version": "2.0.0",
        "method": "Discrete Capacitated Facility Location with Spatial Dispersion",
        "endpoints": ["/api/health", "/api/city", "/api/optimize", "/api/tradeoff", "/docs"]
    }

@app.get("/", summary="Dashboard Application")
@app.get("/app", summary="Visualization Frontend")
def serve_frontend():
    """Serves the frontend single-page application."""
    index_path = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_path):
        return FileResponse(
            index_path,
            media_type="text/html",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    return health_check()

@app.get("/api/city", response_model=CityResponse, summary="Fetch City Grid & Metadata")
def get_city():
    """
    Returns Bangalore spatial bounds, all 800 grid nodes with normalized metrics,
    and default simulation settings.
    """
    return solver.get_city_summary()

@app.post("/api/optimize", response_model=OptimizeResponse, summary="Run Warehouse Location Optimization")
def optimize_network(req: OptimizeRequest):
    """
    Runs the discrete facility location optimizer:
    - Finds p optimal warehouse locations minimizing total operational cost (rent + batched fuel)
    - Enforces Spatial Dispersion (D_min) to guarantee warehouses never clump nearby
    - Employs Regret-First assignment to prevent capacity deadlocks and stranded nodes
    - Applies 3-delivery order batching (milk-run routing)
    """
    result = solver.solve(
        num_warehouses=req.num_warehouses,
        budget_monthly=req.budget_monthly,
        property_size_sqft=req.property_size_sqft,
        petrol_cost_per_km=req.petrol_cost_per_km,
        batch_size=req.batch_size,
        min_dispersion_km=req.min_dispersion_km,
        max_radius_km=req.max_radius_km,
        use_capacity=req.use_capacity,
        capacity_per_warehouse=req.capacity_per_warehouse,
        ev_fleet_pct=req.ev_fleet_pct,
        picking_time_min=req.picking_time_min,
        target_sla_minutes=req.target_sla_minutes,
        demand_multiplier=req.demand_multiplier,
        traffic_multiplier=req.traffic_multiplier,
        disabled_warehouse_ids=req.disabled_warehouse_ids
    )
    return result

@app.get("/api/tradeoff", response_model=TradeoffResponse, summary="Fetch U-Curve Cost Trade-off")
def get_tradeoff(
    budget_monthly: Optional[float] = Query(None, description="Monthly rent budget"),
    property_size_sqft: float = Query(2500.0, description="Warehouse size in sq.ft"),
    petrol_cost_per_km: float = Query(2.0, description="Fuel cost rate"),
    batch_size: int = Query(23, description="Deliveries per driver per day (default: 23)"),
    min_dispersion_km: float = Query(6.5, description="Min separation distance between hubs in km"),
    target_p: Optional[int] = Query(None, description="Current chosen warehouse count to highlight"),
    ev_fleet_pct: float = Query(0.0, description="EV fleet percentage")
):
    """
    Generates the U-curve trade-off data showing how total operational cost evolves
    across candidate warehouse counts under spatial dispersion and EV green fleet constraints.
    """
    return solver.compute_tradeoff(
        budget_monthly=budget_monthly,
        property_size_sqft=property_size_sqft,
        petrol_cost_per_km=petrol_cost_per_km,
        batch_size=batch_size,
        min_dispersion_km=min_dispersion_km,
        target_p=target_p,
        ev_fleet_pct=ev_fleet_pct
    )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    is_prod = os.environ.get("ENVIRONMENT", "development").lower() == "production"
    if is_prod:
        uvicorn.run(app, host=host, port=port)
    else:
        uvicorn.run("app:app", host=host, port=port, reload=True, app_dir=os.path.dirname(os.path.abspath(__file__)))
