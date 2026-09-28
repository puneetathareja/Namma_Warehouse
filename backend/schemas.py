from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class OptimizeRequest(BaseModel):
    num_warehouses: int = Field(default=3, ge=1, le=100, description="Number of warehouses to place (1 to 100)")
    budget_monthly: Optional[float] = Field(default=None, description="Max monthly facility rent budget in INR (None = unconstrained)")
    property_size_sqft: float = Field(default=2500.0, ge=100.0, description="Warehouse footprint in sq.ft (default: 2,500 sq.ft)")
    petrol_cost_per_km: float = Field(default=2.0, ge=0.5, description="Fuel cost rate in INR per km (default: 2.0)")
    batch_size: int = Field(default=23, ge=1, le=50, description="Deliveries per driver per day (default: 23, range: 15-30) or batch trip size")
    min_dispersion_km: float = Field(default=6.5, ge=0.0, description="Minimum separation distance between hubs in km (default: 6.5 km)")
    max_radius_km: Optional[float] = Field(default=None, description="Max delivery radius cutoff in km (None = unconstrained)")
    use_capacity: bool = Field(default=False, description="Whether to enforce warehouse capacity limits")
    capacity_per_warehouse: Optional[float] = Field(default=None, description="Max daily order throughput per warehouse")
    ev_fleet_pct: float = Field(default=0.0, ge=0.0, le=100.0, description="Percentage of delivery fleet transitioned to Electric 2-Wheelers (0 to 100%)")
    picking_time_min: float = Field(default=3.0, ge=0.0, le=15.0, description="Dark store picking and packing time in minutes (default: 3.0)")
    target_sla_minutes: float = Field(default=10.0, ge=5.0, le=60.0, description="Quick-Commerce SLA target in minutes (default: 10.0)")
    demand_multiplier: float = Field(default=1.0, ge=0.1, le=5.0, description="Demand scaling multiplier for scenario simulation (default: 1.0)")
    traffic_multiplier: float = Field(default=1.0, ge=0.5, le=3.0, description="Traffic impedance scaling multiplier (default: 1.0)")
    disabled_warehouse_ids: List[str] = Field(default=[], description="Warehouse candidate point IDs disabled due to disruptions")

class WarehouseDetail(BaseModel):
    id: str
    name: str
    locality: str
    zone: str
    lat: float
    lng: float
    price_per_sqft: float
    traffic_index: float
    suitability_score: float
    monthly_rent: float
    annual_rent: float
    assigned_orders: float
    employees_required: int
    daily_salary: float
    monthly_salary: float
    utilization_pct: float
    capacity: float = 0.0
    color: str
    avg_delivery_time_min: float = 0.0
    sla_compliance_pct: float = 0.0

class Assignment(BaseModel):
    demand_id: str
    warehouse_id: str
    distance_km: float

class CostBreakdown(BaseModel):
    daily_fleet_km: float
    daily_fuel: float
    annual_fuel: float
    daily_fuel_liters: float
    annual_co2_tons: float
    avg_km_per_driver: float
    total_employees: int
    daily_driver_wages: float
    monthly_driver_wages: float
    monthly_rent: float
    annual_rent: float
    total_annual: float
    budget_used_pct: Optional[float] = None
    avg_delivery_time_min: float = 0.0
    avg_dispatch_time_min: float = 0.0
    avg_transit_time_min: float = 0.0
    avg_doorstep_time_min: float = 0.0
    sla_compliance_pct: float = 0.0
    target_sla_minutes: float = 10.0
    ev_fleet_pct: float = 0.0
    petrol_running_cost_per_km: float = 2.0
    ev_charging_cost_per_km: float = 0.35
    daily_petrol_cost: float = 0.0
    daily_ev_cost: float = 0.0
    daily_fuel_savings: float = 0.0
    annual_fuel_savings: float = 0.0
    annual_co2_saved_tons: float = 0.0
    baseline: Optional[Dict[str, Any]] = None

class OptimizeResponse(BaseModel):
    status: str
    reason: Optional[str] = None
    message: Optional[str] = None
    suggested_budget: Optional[float] = None
    warehouses: List[WarehouseDetail] = []
    assignments: List[Assignment] = []
    costs: Optional[CostBreakdown] = None
    meta: Dict[str, Any] = {}

class CityDataPoint(BaseModel):
    point_id: str
    latitude: float
    longitude: float
    orders_per_day: float
    price_per_sqft: float
    traffic_index: float
    norm_demand: float
    norm_price: float
    norm_traffic: float
    suitability_score: float
    nearest_locality: str
    zone: str

class CityResponse(BaseModel):
    bounds: Dict[str, float]
    total_points: int
    total_daily_orders: float
    points: List[CityDataPoint]
    defaults: Dict[str, Any]

class TradeoffPoint(BaseModel):
    num_warehouses: int
    monthly_rent: float
    annual_rent: float
    annual_fuel: float
    total_annual: float
    feasible: bool

class TradeoffResponse(BaseModel):
    points: List[TradeoffPoint]
    recommended_p: int
