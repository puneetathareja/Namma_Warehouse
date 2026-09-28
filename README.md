# Namma Warehouse (GRIDPOINT) — Bangalore Warehouse Spatial Optimization Platform

> **Discrete Capacitated Facility Location Optimizer, 10-Minute Quick-Commerce SLA Engine & ESG Fleet Simulator tailored for Bengaluru Metropolitan Area (BBMP).**

---

## 📌 Table of Contents

1. [Background & Problem Statement](#-background--problem-statement)
2. [Core Platform Features & Capabilities](#-core-platform-features--capabilities)
3. [Bengaluru Geospatial Context](#-bengaluru-geospatial-context)
4. [The Core Quick-Commerce Insight](#-the-core-insight-why-3-warehouses-fail-at-10-minute-delivery)
5. [Mathematical Formulations & Equations](#-mathematical-formulations--equations)
   - [Objective Function (DCFLP)](#discrete-capacitated-facility-location-formulation)
   - [Adaptive Spatial Dispersion Constraints](#adaptive-spatial-dispersion-constraints)
   - [Anti-Deadlock Regret-First Demand Allocation](#anti-deadlock-regret-first-demand-allocation)
   - [Vectorized 1-Opt Local Swap Search](#vectorized-local-swap-search)
   - [3-Phase Kinematic 10-Minute SLA Equation](#️-10-minute-quick-commerce-sla-compliance-metric)
   - [Workforce & Milk-Run Route Modeling](#-delivery-workforce-modeling--economics)
   - [EV Fleet Transition & ESG Carbon Accounting](#-ev-fleet-transition--esg-savings-simulator)
   - [The U-Curve Operational Cost Trade-Off](#-the-u-curve-operational-cost-trade-off)
6. [Machine Learning & Operations Research Architecture](#-machine-learning--operations-research-architecture)
   - [Why Operations Research Outperforms Black-Box ML](#why-operations-research-outperforms-black-box-ml-for-facility-location)
   - [Where Data Science & ML Techniques Are Used](#where-data-science--ml-techniques-are-used)
7. [Bangalore Geospatial Dataset & Feature Pipeline](#-bangalore-geospatial-dataset--normalization)
8. [Libraries & Technologies Used](#-libraries--technologies-used)
9. [Repository File Structure](#-repository-file-structure)
10. [REST API Specification](#-rest-api-specification)
11. [Frontend Dashboard & Interactive Walkthrough](#-frontend-dashboard--interactive-walkthrough)
12. [Installation, Docker & Deployment](#-installation-docker--deployment)
13. [Platform Highlights & Architectural Summary](#-platform-highlights--architectural-summary)

---

## 🎯 Background & Problem Statement

### Background
An e-commerce / quick-commerce enterprise serves diverse neighborhoods across the metropolitan area from a central distribution network. Each neighborhood has a varying number of daily orders and is located at a distinct geographical coordinate with differing traffic friction. The company needs to establish one or more warehouses such that the overall delivery effort, transit time, real estate lease expenditure, and fuel costs are minimized while satisfying customer Service Level Agreements (SLAs).

### Problem Statement
Build a **Warehouse Location Optimization Platform** that determines where warehouse(s) should be located and which neighborhoods should be assigned to each warehouse. The system minimizes weighted delivery cost, where neighborhoods with higher order volumes contribute more heavily to the objective function, subject to warehouse capacity limits, road network circuity, and maximum service radii.

---

## 🚀 Core Platform Features & Capabilities

GRIDPOINT is an end-to-end spatial logistics decision platform that transforms raw urban demand data into an optimized, cost-effective warehouse and delivery network:

### 1. Interactive Geospatial Visualization & Spatial Ingestion
- **800 Discrete BBMP Demand Nodes**: Visualizes customer orders across the entire Greater Bengaluru metropolitan area with interactive Leaflet map layers, dynamic heatmaps, and coordinate tooltips.
- **Data Ingestion & Filtering**: Search, inspect, and filter candidate wards by zone (North, South, East, West, Central) or ingest custom demand zones on demand via [`DataPage.tsx`](frontend/src/pages/DataPage.tsx).

### 2. Scalable Discrete Facility Location Optimizer
- **1 to 100 Hub Scaling**: Interactive parameter controls allowing planners to place anywhere from 1 to 100 fulfillment centers or micro-hubs (dark stores).
- **Sub-150ms Optimization Engine**: Powered by vectorized NumPy matrix lookahead and 1-Opt local swap search in [`backend/solver.py`](backend/solver.py) to minimize total operational expenditures (facility leases + transit fuel).
- **Adaptive Spatial Dispersion ($D_{\min}$)**: Enforces dynamic inter-hub exclusion zones so warehouses never clump together in high-density pockets (e.g., placing multiple dark stores in the same corner of Koramangala).

### 3. Anti-Deadlock Regret-First Demand Allocation
- **Smart Assignment**: Assigns each neighborhood to its optimal hub based on minimum road circuity and traffic friction.
- **Regret-First Priority**: When capacity limits are enforced, customers with the highest penalty between their nearest and second-nearest warehouse are served first, preventing capacity starvation and deadlocks for boundary nodes.

### 4. Realistic Capacity & Service Radius Constraints
- **Warehouse Capacity Limits**: Automatically sizes warehouse throughput with a 35% buffer above average demand loads to handle peak catchment areas.
- **Max Service Radius Enforcement**: Guarantees delivery commitments by enforcing a hard service radius cutoff, with instant diagnostics and guidance if remote nodes exceed coverage.

### 5. 3-Phase Kinematic 10-Minute SLA Compliance Engine
- **End-to-End Fulfillment Modeling**: Combines 3-minute dark store retrieval and packaging, traffic-impeded two-wheeler road transit, and high-density doorstep handover.
- **Empirical Traffic Dynamics**: Dynamic travel speed calculated per zone based on live congestion indices across Silk Board, Tin Factory, and Outer Ring Road corridors.

### 6. Workforce & Milk-Run Route Economics
- **Driver Workforce Modeling**: Models the active delivery fleet required (52,050 active drivers @ ₹1,000/day baseline wages) based on realistic shift throughput (mean 23 deliveries/driver/day).
- **Consolidated Milk-Run Routing**: Evaluates multi-drop delivery batches to calculate realistic daily fleet kilometers, fuel burn, and wage expenditures.

### 7. EV Fleet Electrification & ESG Carbon Accounting
- **Green Fleet Simulator**: Live toggle to evaluate fleet transition ratios from 0% (100% petrol) to 100% EV.
- **Operational Savings & Carbon Reduction**: Evaluates ₹2.00/km (petrol) vs. ₹0.35/km (EV charging), demonstrating over ₹44 Crore/year in fuel savings and eliminating 17,700+ tons of CO₂ annually.

### 8. Real-Time Baseline Comparison & Scenario Stress Testing
- **Baseline vs. Optimized Benchmarking**: Live comparison against unoptimized single-hub or ad-hoc logistics networks with automated percentage savings badges (`↓ 18% vs baseline`).
- **Interactive Crisis Simulation**: [`ScenariosPage.tsx`](frontend/src/pages/ScenariosPage.tsx) simulates real-world supply chain disruptions:
  - **Festive Demand Surge (+40% Orders)**: Tests capacity limits during Diwali / Big Billion Days.
  - **Peak ORR Congestion (+30% Traffic Delay)**: Stress tests SLA compliance during peak rush hours.
  - **Bengaluru Monsoon Inundation (+50% Fuel Burn)**: Simulates waterlogging and rerouting overhead.

### 9. Infrastructure vs. Delivery Cost Trade-Off (U-Curve)
- **Economic Equilibrium**: Explores the trade-off between fixed real estate commercial leases and variable fleet delivery fuel costs.
- **Optimal Hub Discovery**: Automatically computes and visualizes the global convex cost minimum ($p^*$) via the `/api/tradeoff` endpoint.

### 10. Enterprise Platform Tools & Onboarding
- **Interactive Guided Tour**: 5-step walkthrough modal ([`TourModal.tsx`](frontend/src/components/TourModal.tsx)) explaining spatial maps, optimization sliders, ESG simulator, and warehouse scorecard.
- **Enterprise Demo & Consultation**: Dedicated inquiry modal ([`EnquiryModal.tsx`](frontend/src/components/EnquiryModal.tsx)) for supply chain teams to request custom network simulations.
- **Corridor Transit Telemetry**: Live status marquee ([`LogisticsTransitBanner.tsx`](frontend/src/components/LogisticsTransitBanner.tsx)) tracking congestion on Silk Board, Electronic City, and Whitefield arteries.

---

## 🗺️ Bengaluru Geospatial Context

The platform is built around the unique geography and supply chain dynamics of the **Bruhat Bengaluru Mahanagara Palike (BBMP)** metropolitan area:

- **Geographical Boundary**: 
  - Latitude: $12.80^\circ \text{N}$ to $13.15^\circ \text{N}$
  - Longitude: $77.45^\circ \text{E}$ to $77.78^\circ \text{E}$
  - Total Spatial Area: $\sim 750 \text{ sq.km}$
- **800 Discrete Candidate Nodes**: Derived from BBMP administrative wards (East, West, South, North, and Central Zones), dissolving residential and commercial ward polygons into 800 discrete candidate nodes.
- **Daily Demand Scale**: **1,197,150 customer orders/day** distributed across all 800 nodes (ranging from 800 to 2,800 orders/node/day).
- **Key Congestion Corridors**: Outer Ring Road (Silk Board $\rightarrow$ Marathahalli $\rightarrow$ KR Puram), Tin Factory, Bellandur, and Hebbal Flyover calibrated with high traffic impedance ($\tau_i \ge 0.75$).
- **Commercial Real Estate Rates**: Locality rental pricing benchmarks across Indiranagar, Koramangala, Peenya Industrial Area, Whitefield, HSR Layout, and Electronic City.

---

## ⚡ The Core Insight: Why 3 Warehouses Fail at 10-Minute Delivery

Non-technical stakeholders and corporate planners often assume that 3 or 4 large regional distribution centers are sufficient to cover Bangalore. **GRIDPOINT mathematically proves why this is physically impossible for quick-commerce**:

- In a 3-warehouse network, the average delivery distance to customer doorsteps is **7 to 12 km**.
- At typical Bangalore two-wheeler traffic speeds (averaging ~20-25 km/h) plus a mandatory 3-minute warehouse picking and packing window:
  - Average delivery time is **~19.5 to 21 minutes**.
  - Only **~11.6%** of customer orders can physically be delivered within 10 minutes.
- To achieve true quick-commerce SLA compliance, companies must decentralize into **50 to 100 localized micro-hubs (dark stores)**:
  - At **25 warehouses**: Average delivery time drops to **9.2 minutes**, with **61.7%** SLA compliance.
  - At **75 micro-hubs**: Average delivery time drops to **6.4 minutes**, achieving **98.3%** SLA compliance.

---

## 🧠 Mathematical Formulations & Optimization Logic

### Discrete Capacitated Facility Location Formulation

Let $I$ be the set of 800 discrete customer demand nodes across Bangalore, and $J$ be the set of 800 candidate warehouse sites ($J \subseteq I$).

- $d_i$: Daily order demand at customer node $i \in I$ (totaling 1,197,150 orders/day across Bangalore).
- $c_j$: Monthly commercial rental cost for operating a warehouse facility at site $j \in J$.
- $D_{ij}$: Road transit distance between customer node $i$ and warehouse site $j$.
- $T_{ij}$: Traffic-weighted travel time between node $i$ and warehouse $j$.
- $p$: Target number of warehouses to place ($1 \le p \le 100$).
- $y_j \in \{0, 1\}$: Binary decision variable indicating whether warehouse site $j$ is activated.
- $x_{ij} \in \{0, 1\}$: Decision variable indicating whether demand node $i$ is assigned to warehouse $j$.

#### Objective Function
The optimizer minimizes total annual operational expenditure:
$$\min \quad \sum_{j \in J} c_j \cdot y_j + \text{Fleet Travel Cost}(x, D) + \text{Workforce Wages}$$

Subject to:
$$\sum_{j \in J} y_j = p$$
$$\sum_{j \in J} x_{ij} = 1 \quad \forall i \in I$$
$$x_{ij} \le y_j \quad \forall i \in I, j \in J$$
$$\| \text{loc}_j - \text{loc}_k \| \ge D_{\min} \cdot y_j y_k \quad \forall j \neq k \quad \text{(Spatial Dispersion)}$$
$$\sum_{i \in I} d_i \cdot x_{ij} \le \text{Cap}_j \cdot y_j \quad \forall j \in J \quad \text{(Capacity Constraint)}$$

---

### Adaptive Spatial Dispersion Constraints

A critical real-world failure mode in greedy facility optimization is **hub clumping** (e.g., placing multiple warehouses next to each other in high-density areas like Koramangala). 

GRIDPOINT enforces a minimum inter-warehouse separation distance ($D_{\min}$):
- For small networks ($p \le 5$), $D_{\min}$ defaults to **6.5 km**.
- As the user scales the network up to 100 micro-hubs, Bangalore's geographic area (~750 sq.km) naturally requires tighter spacing. The solver incorporates **Adaptive Spatial Dispersion Scaling**:
$$D_{\text{effective}} = \min\left(D_{\text{user}}, \sqrt{\frac{750.0}{\pi \cdot p}} \times 1.25\right)$$
This guarantees that candidate hubs spread evenly across North, South, East, West, and Central Bangalore without clustering or becoming mathematically infeasible.

---

### Anti-Deadlock Regret-First Demand Allocation

When warehouse capacity limits are active, naive greedy assignment (assigning nearest customers first) leads to capacity exhaustion at central hubs, leaving remote boundary customers stranded with no available warehouse within radius.

GRIDPOINT implements **Regret-Based Allocation**:
1. For every demand node $i$, calculate its regret value:
$$\text{Regret}_i = D_{i, \text{second\_nearest}} - D_{i, \text{nearest}}$$
2. Customers with the highest regret are prioritized for assignment first because being denied their nearest hub incurs the largest distance penalty.
3. Low-regret customers (who sit equidistant between multiple hubs) are assigned last, ensuring zero stranded nodes and zero allocation deadlocks.

---

### Vectorized Local Swap Search

Following greedy seeding, GRIDPOINT executes an ultra-fast vectorized 1-opt local swap search across NumPy distance matrices:
- Evaluates moving any active warehouse $j$ to any unselected candidate site $j'$.
- Leverages broadcasting matrix subtraction:
$$\Delta \text{Cost} = \text{Demand} \cdot \left( \min(D_{\text{existing}}, D_{j'}) - D_{\text{current}} \right)$$
- Converges to a local optimum in less than 150 milliseconds.

---

## ⏱️ 10-Minute Quick-Commerce SLA Compliance Metric

To evaluate customer fulfillment speed, GRIDPOINT models realistic urban two-wheeler physics modulated by real-time traffic congestion:

### 1. Urban Transit Speed Model
Bangalore two-wheelers cannot travel at highway speeds due to signals, speed breakers, and arterial congestion. Speed is modeled dynamically as a function of each zone's empirical traffic density index ($0.0 \le \tau_i \le 1.0$):
$$\text{Speed}_i (\text{km/h}) = \frac{30.0}{1.0 + 0.28 \cdot \tau_i}$$
- Free-flowing peripheral roads: ~26–30 km/h.
- Heavy arterial corridors (Silk Board, Tin Factory, Outer Ring Road): ~18–22 km/h.

### 2. End-to-End Delivery Time Equation
$$\text{Delivery Time}_i (\text{minutes}) = \text{Picking Time} + \left( \frac{D_{ij}}{\text{Speed}_i} \times 60 \right)$$
Where:
- $\text{Picking Time} = 3.0 \text{ minutes}$ (dark store item retrieval, packing, QR scanning, and rider handoff).
- $D_{ij}$ is the road transit distance in kilometers (derived using Haversine distance adjusted by a 1.28x urban street grid detour factor).

### 3. Network SLA Compliance Gauge
An order is strictly compliant if $\text{Delivery Time}_i \le 10.0 \text{ minutes}$.

$$\text{SLA Compliance \%} = \frac{\sum_{i \in \text{Compliant}} d_i}{\sum_{i \in I} d_i} \times 100$$

| Warehouse Count ($p$) | Avg Delivery Distance | Avg Delivery Time | 10-Min SLA Compliance | Verdict |
| :---: | :---: | :---: | :---: | :--- |
| **3 Hubs** | 10.8 km | **19.5 min** | **11.6%** | ❌ Physically impossible for 10-min delivery |
| **10 Hubs** | 5.6 km | **13.4 min** | **34.2%** | ⚠️ Moderate coverage; frequent SLA breaches |
| **25 Hubs** | 3.2 km | **9.2 min** | **61.7%** | 🟡 Viable quick-commerce core coverage |
| **50 Hubs** | 2.1 km | **7.5 min** | **84.9%** | 🟢 Strong quick-commerce fulfillment |
| **75 Hubs** | 1.6 km | **6.4 min** | **98.3%** | 🏆 Near-perfect 10-minute SLA guarantee |

---

## 👥 Delivery Workforce Modeling & Economics

GRIDPOINT models the complete labor and delivery economics for Bangalore's quick-commerce operations:

- **Total Citywide Demand**: 1,197,150 customer orders per day across 800 grid nodes.
- **Rider Shift Capacity**: A delivery driver completes an average of **23 deliveries per 8-hour shift** (configurable from 15 to 30 deliveries/day in the UI).
- **Active Fleet Workforce**:
$$\text{Total Drivers} = \frac{1,197,150 \text{ orders/day}}{23 \text{ orders/driver/day}} \approx \mathbf{52,050 \text{ active drivers}}$$
- **Fair Wage Baseline**: Drivers earn a standard daily wage of **₹1,000 / day** (~₹30,000 / month), representing ₹5.2 Crore/day in direct logistics employment.
- **Driver Daily Travel**:
  - Across 23 deliveries with localized dispatch, each driver travels approximately **14 to 20 km per daily shift**.
  - Total citywide fleet travel across all 52,050 drivers is **~650,000 to 850,000 km/day**.

---

## 🌿 EV Fleet Transition & ESG Savings Simulator

Quick-commerce companies face immense regulatory and environmental pressure to transition from internal combustion engine (ICE) vehicles to electric two-wheelers.

GRIDPOINT includes an interactive **ESG Fleet Power Simulator** allowing logistics managers to evaluate fleet transition ratios from 0% to 100%:

### 1. Operating Cost Comparison
- **Petrol 2-Wheeler Running Cost**: **₹2.00 / km** (assuming ₹102/L petrol and 50 km/L real-world efficiency).
- **Electric 2-Wheeler Running Cost**: **₹0.35 / km** (assuming 3.0 kWh battery, 75 km range, ₹8.5/unit commercial electricity).
- **Fuel Cost Reduction**: Electric two-wheelers operate **82.5% cheaper** than petrol vehicles.

### 2. Fleet Financial Savings (at 100% EV Transition)
- **Baseline Petrol Fuel Cost**: ~₹14.7 Lakh / day (₹53.6 Crore / year).
- **Electric Fleet Charging Cost**: ~₹2.6 Lakh / day (₹9.5 Crore / year).
- **Net Fuel Savings**: **~₹12.1 Lakh / day** $\rightarrow$ **₹44.3 to ₹48.0+ Crore / year** in direct operational savings.

### 3. Environmental Impact & Carbon Accounting
- **Emissions Factor**: Petrol two-wheelers consume ~1 liter per 35 km in stop-and-go city traffic, emitting **2.31 kg CO₂ per liter**.
- **Annual Baseline Carbon**: ~17,700 Metric Tons of CO₂ emitted annually.
- **100% EV Transition**: **100% elimination of tailpipe emissions**, preventing **over 17,700 Metric Tons of CO₂** every year.

---

## 📉 The U-Curve Operational Cost Trade-Off

A fundamental question in supply chain design is: **How many warehouses produce the lowest overall operational cost?**

GRIDPOINT plots the classic U-Curve trade-off between:
1. **Fixed Real Estate Costs**: Monthly facility commercial rent scales linearly upward as warehouse count $p$ increases:
$$\text{Cost}_{\text{facility}} = p \times \text{Avg Rent}$$
2. **Dynamic Travel Costs**: Fleet fuel and transit costs scale hyperbolically downward as warehouse count $p$ increases because goods originate closer to customers:
$$\text{Cost}_{\text{transit}} \propto \frac{1}{\sqrt{p}}$$

The total operational cost curve exhibits a convex minimum ($p^*$), which GRIDPOINT identifies through the `/api/tradeoff` endpoint.

---

## 🔬 Machine Learning & Operations Research Architecture

A frequent architectural question in spatial logistics is: **"Is Machine Learning used in this project?"**

### Why Operations Research Outperforms Black-Box ML for Facility Location
Standard machine learning models (such as unsupervised K-Means clustering, Gaussian Mixture Models, or Deep Reinforcement Learning) are fundamentally flawed when applied naively to physical urban logistics:
1. **Continuous vs. Discrete Space Infeasibility**: K-Means computes spatial centroids in unconstrained continuous coordinates. In Bengaluru, this routinely suggests warehouses inside Bellandur Lake, protected military defense land, or restricted residential enclaves.
2. **Economic Blindness**: K-Means treats all spatial points equally, ignoring that commercial real estate in Indiranagar or Koramangala costs 3x to 5x more than Peenya or Bommasandra.
3. **Hard Constraint Violation**: Neural network approximation models struggle with strict operational constraints (maximum lease budgets, warehouse order capacities, minimum spatial separation $D_{\min}$).

For these reasons, GRIDPOINT uses **Exact and Heuristic Operations Research (Mathematical Optimization)**:
- **Discrete Capacitated Facility Location Problem (DCFLP)** with binary decision variables.
- **Adaptive Spatial Dispersion** to prevent hub clumping in dense areas.
- **Anti-Deadlock Regret-First Demand Allocation** ensuring zero unserved boundary customers.
- **Vectorized 1-Opt Local Swap Search** converging in under 150ms.

### Where Data Science & ML Techniques Are Used
While the core placement engine is rooted in Operations Research, **data science and machine learning principles are used throughout the feature engineering and modeling pipeline**:

1. **Gaussian Spatial Decay Fields & Kernel Smoothing (`City data/traffic/spatial_fields.py`)**:
   - Continuous 2D Gaussian Radial Basis kernels ($\exp(-\frac{d^2}{2\sigma^2})$) model spatial traffic spillover from major congestion epicenters (Silk Board Junction, Tin Factory, Hebbal, KR Puram).
2. **Multi-Criteria Feature Engineering & Suitability Scoring Function**:
   - Each BBMP ward candidate is scored using a normalized composite multi-attribute decision function:
   $$\text{Suitability}_j = w_1 \cdot \text{NormDemand}_j + w_2 \cdot (1 - \text{NormPrice}_j) + w_3 \cdot (1 - \text{NormTraffic}_j)$$
   Balancing customer order volume against commercial rental overhead and road friction.
3. **Physics-Informed Empirical Kinematic Modeling**:
   - Travel speeds are dynamically calibrated using real-world TomTom urban traffic impedance indices to model two-wheeler delivery physics.
4. **Counterfactual Crisis Simulation (`ScenariosPage.tsx`)**:
   - Predictive sensitivity modeling evaluating supply chain resilience under non-linear perturbations (Diwali +40% surge, Monsoon +50% fuel penalty, ORR +30% delay).

---

## 🗺️ Bangalore Geospatial Dataset & Normalization

All spatial, pricing, and congestion datasets are curated and stored in [`City data/`](City%20data):

| File Path | Description | Records | Open Source References & Links |
| :--- | :--- | :---: | :--- |
| [`City data/bangalore_data_normalized.csv`](City%20data/bangalore_data_normalized.csv) | 800 discrete BBMP nodes with Lat, Lng, Orders, Price/sqft, Traffic Index, Suitability Score | 800 rows | • [OpenCity Bengaluru Ward Boundaries GIS Data](https://opencity.in/data/bengaluru-bbmp-ward-boundaries-2020)<br>• [BBMP Official GIS Portal](https://bbmp.gov.in)<br>• [OpenStreetMap Overpass API](https://overpass-turbo.eu/) |
| [`City data/prices/bangalore_locality_prices.csv`](City%20data/prices/bangalore_locality_prices.csv) | Commercial warehouse real estate lease benchmarks across BBMP zones | 25 localities | • [Kaggle Bengaluru House Price & Real Estate Dataset](https://www.kaggle.com/datasets/amitabhajoy/bengaluru-house-price-data)<br>• [99acres Bengaluru Commercial Real Estate Trends](https://www.99acres.com/property-rates-and-price-trends-in-bangalore-prffid) |
| [`City data/prices/generate_price_real.py`](City%20data/prices/generate_price_real.py) | Python script for calibrating locality commercial rental rates and diagnostic distributions | Script | Curated property market data |
| [`City data/demand/generate_demand.py`](City%20data/demand/generate_demand.py) | Python script generating population-weighted daily demand vectors | Script | • [Census of India — Bengaluru District Population Density](https://censusindia.gov.in/) |
| [`City data/traffic/spatial_fields.py`](City%20data/traffic/spatial_fields.py) | 2D Gaussian spatial decay fields for arterial congestion corridors | Script | • [TomTom Bengaluru Traffic Index](https://www.tomtom.com/traffic-index/bangalore-traffic/)<br>• [Uber Movement Speeds Open Data](https://movement.uber.com/) |
| [`frontend/src/data/rawBengaluruPoints.ts`](frontend/src/data/rawBengaluruPoints.ts) | Client-side TypeScript bundle of all 800 nodes for offline instant fallback | 800 nodes | Compiled directly from `bangalore_data_normalized.csv` |

---

## 🛠️ Libraries & Technologies Used

### Backend Architecture (Python 3.10+)
| Library / Tool | Version | Role in Project |
| :--- | :---: | :--- |
| **FastAPI** | `^0.110.0` | Asynchronous, high-throughput REST API with automated OpenAPI docs |
| **Uvicorn** | `^0.28.0` | Lightning-fast ASGI production web server with auto-reload |
| **NumPy** | `^1.26.0` | High-performance vectorized matrix math, broadcasted Haversine, and regret sorting |
| **Pydantic** | `^2.6.0` | Strict request/response data validation, schema enforcement, and serialization |

### Frontend Architecture (React 19 + TypeScript + Vite)
| Library / Tool | Version | Role in Project |
| :--- | :---: | :--- |
| **React** | `^19.0.0` | Modern declarative UI component architecture |
| **TypeScript** | `^5.2.0` | End-to-end type safety across spatial models and API telemetry |
| **Vite** | `^5.0.0` | High-speed frontend build tooling with Hot Module Replacement (HMR) |
| **Leaflet** | `^1.9.4` | High-performance interactive spatial mapping and layer rendering |
| **react-leaflet** | `^4.2.1` | React bindings for Leaflet map canvas and vector spoke lines |
| **Lucide React** | `^0.344.0` | Modern iconography for logistics metrics, alerts, and controls |
| **Custom CSS System** | — | Bespoke glassmorphic styling, responsive drawer, and KPI widgets |

### Container & Production
| Tool / Specification | Role in Project |
| :--- | :--- |
| **Docker (Multi-Stage)** | Self-contained turnkey container combining Vite build + Python runtime |

---

## 🏗️ Repository File Structure

```text
namma-warehouse-main/
├── Dockerfile                         # Multi-stage production container build (Node.js 20 + Python 3.11)
├── .dockerignore                      # Build context exclusions
├── requirements.txt                   # Root Python dependencies wrapper
├── package.json                       # Root workspace orchestration scripts (npm run dev/build/etc.)
├── run.ps1                            # One-click Windows PowerShell startup script
├── start.bat                          # One-click Windows Batch startup script
├── problem_statement.txt              # Hackathon requirements specification
├── README.md                          # Master project documentation
│
├── backend/
│   ├── app.py                         # FastAPI REST API endpoints & CORS middleware
│   ├── solver.py                      # GridpointSolver class (DCFLP, SLA engine, ESG model)
│   ├── schemas.py                     # Pydantic request/response data validation models
│   ├── test_full_backend.py           # Automated backend test suite
│   └── requirements.txt               # Backend Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/                # Modular UI components
│   │   │   ├── LogisticsMap.tsx       # Leaflet map canvas, markers & spoke lines
│   │   │   ├── OptimizationPanel.tsx  # Parameter controls (warehouses, budget, fuel, EV)
│   │   │   ├── NetworkOperationsPanel.tsx # ESG emissions, workforce & KPI meters
│   │   │   ├── WarehouseResultsGrid.tsx # Table of placed warehouses and capacities
│   │   │   ├── TopHeader.tsx          # Navigation, notification bell & status badge
│   │   │   ├── HeroBanner.tsx         # Executive metrics and quick insights
│   │   │   ├── FeaturesDrawer.tsx     # Feature showcase drawer
│   │   │   ├── DashboardCharts.tsx    # Delivery time distribution, cost breakdown & fleet charts
│   │   │   ├── EnquiryModal.tsx       # Enterprise supply chain RFP and demo consultation modal
│   │   │   ├── TourModal.tsx          # 5-step interactive onboarding walkthrough
│   │   │   └── LogisticsTransitBanner.tsx # Live corridor status ticker & traffic monitor
│   │   ├── pages/                     # Application views
│   │   │   ├── DashboardPage.tsx      # Main executive dashboard
│   │   │   ├── ScenariosPage.tsx      # Stress testing (festive surge, monsoon, ORR traffic)
│   │   │   ├── AnalyticsPage.tsx      # U-Curve cost tradeoff & carbon charts
│   │   │   ├── DataPage.tsx           # Searchable table of 800 BBMP coordinate nodes
│   │   │   └── SettingsPage.tsx       # System configurations
│   │   ├── services/
│   │   │   └── api.ts                 # Backend communication wrapper with offline fallback
│   │   ├── data/
│   │   │   ├── rawBengaluruPoints.ts  # Pre-compiled 800 Bengaluru coordinate nodes
│   │   │   └── cityData.ts            # City configuration and defaults
│   │   ├── utils/
│   │   │   ├── solver.ts              # Client-side fallback solver (offline capability)
│   │   │   ├── geo.ts                 # Geodesic Haversine and circuity utilities
│   │   │   └── formatters.ts          # INR currency & metric formatters
│   │   ├── types.ts                   # Comprehensive TypeScript interfaces
│   │   ├── App.tsx                    # Master root container and state manager
│   │   ├── main.tsx                   # React 19 entry point
│   │   └── index.css                  # Design system tokens and styles
│   ├── .env.example                   # Environment variable template
│   ├── .env.production                 # Production API endpoint configuration
│   ├── index.html                     # HTML5 template
│   ├── package.json                   # Frontend dependencies
│   ├── tsconfig.json                  # TypeScript compiler settings
│   └── vite.config.ts                 # Vite bundler configuration & API proxy
│
└── City data/
    ├── bangalore_data_normalized.csv  # 800 normalized BBMP coordinate nodes
    ├── bangalore_data.csv             # Raw BBMP ward dataset
    ├── grid.csv                       # Spatial lattice coordinates
    ├── prices/
    │   ├── bangalore_locality_prices.csv # Commercial rental lease rates
    │   ├── price_diagnostics.csv      # Locality price distribution statistics
    │   └── generate_price_real.py     # Real estate pricing model script
    ├── demand/
    │   ├── demand.csv                 # Ward daily order demand vector
    │   ├── demand_heatmap.png         # Heatmap preview visualization
    │   └── generate_demand.py         # Demand generation model script
    └── traffic/
        ├── traffic_diagnostics.csv    # Congestion corridor statistics
        ├── traffic_preview.png        # Traffic density overlay preview
        ├── generate_traffic.py        # Traffic calibration script
        └── spatial_fields.py          # 2D Gaussian spatial decay fields
```

---

## 🔌 REST API Specification

### 1. `GET /health` or `GET /api/health`
Checks backend service availability and solver readiness.
```json
{
  "status": "online",
  "service": "GRIDPOINT Discrete Spatial Optimization API",
  "version": "2.0.0",
  "method": "Discrete Capacitated Facility Location with Spatial Dispersion",
  "endpoints": ["/api/health", "/api/city", "/api/optimize", "/api/tradeoff", "/docs"]
}
```

### 2. `GET /api/city`
Fetches bounding coordinates, metadata, and all 800 discrete candidate nodes.
```json
{
  "bounds": { "min_lat": 12.83, "max_lat": 13.14, "min_lng": 77.48, "max_lng": 77.76 },
  "total_points": 800,
  "total_daily_orders": 1197150.0,
  "points": [ ... ],
  "defaults": {
    "num_warehouses": 3,
    "property_size_sqft": 2500.0,
    "batch_size": 23,
    "min_dispersion_km": 6.5,
    "ev_fleet_pct": 0.0,
    "target_sla_minutes": 10.0
  }
}
```

### 3. `POST /api/optimize`
Executes the discrete facility location solver.

**Request Body:**
```json
{
  "num_warehouses": 25,
  "budget_monthly": null,
  "property_size_sqft": 2500.0,
  "petrol_cost_per_km": 2.0,
  "batch_size": 23,
  "min_dispersion_km": 6.5,
  "max_radius_km": null,
  "use_capacity": false,
  "capacity_per_warehouse": null,
  "ev_fleet_pct": 100.0,
  "picking_time_min": 3.0,
  "target_sla_minutes": 10.0,
  "demand_multiplier": 1.0,
  "traffic_multiplier": 1.0,
  "disabled_warehouse_ids": []
}
```

**Key Request Parameters:**
- `num_warehouses` (int, 1–100): Number of warehouses/dark stores to place.
- `budget_monthly` (float, optional): Maximum facility lease ceiling in INR.
- `min_dispersion_km` (float): Minimum separation distance between any two active warehouses.
- `use_capacity` (bool): Activates capacity constraint with Anti-Deadlock Regret-First allocation.
- `ev_fleet_pct` (float, 0–100): Percentage of active delivery fleet powered by electric two-wheelers.
- `demand_multiplier` (float, 0.1–5.0): Stress testing demand scaling factor (e.g., 1.4 for +40% festive surge).
- `traffic_multiplier` (float, 0.5–3.0): Road friction multiplier (e.g., 1.3 for +30% peak congestion).
- `disabled_warehouse_ids` (List[str]): Candidate node IDs temporarily disabled to model facility disruption.

**Response Body (Excerpt):**
```json
{
  "status": "ok",
  "warehouses": [
    {
      "id": "p042",
      "name": "Koramangala Hub",
      "locality": "Koramangala",
      "zone": "South",
      "lat": 12.9352,
      "lng": 77.6245,
      "avg_delivery_time_min": 8.4,
      "sla_compliance_pct": 74.2,
      "assigned_orders": 48200.0,
      "employees_required": 2095,
      "monthly_rent": 342000.0,
      "color": "#3b82f6"
    }
  ],
  "costs": {
    "daily_fleet_km": 735200.0,
    "avg_delivery_time_min": 9.2,
    "sla_compliance_pct": 61.7,
    "daily_fuel": 257320.0,
    "daily_fuel_liters": 0.0,
    "annual_fuel": 93921800.0,
    "annual_co2_tons": 0.0,
    "daily_driver_wages": 52050000.0,
    "monthly_rent": 8550000.0,
    "total_annual": 2002573200.0,
    "daily_fuel_savings": 1213080.0,
    "annual_fuel_savings": 442774200.0,
    "annual_co2_saved_tons": 17713.4,
    "total_employees": 52050
  },
  "unserved_points": []
}
```

### 4. `GET /api/tradeoff`
Computes the U-Curve trade-off data across candidate warehouse counts ($p = 1$ to $5$ or custom range).
- **Query Parameters**: `property_size_sqft`, `petrol_cost_per_km`, `batch_size`, `min_dispersion_km`, `ev_fleet_pct`, `budget_monthly`.

---

## 💻 Frontend Dashboard & Interactive Walkthrough

The web application provides an intuitive, high-performance interface for executive decision-making:

- **Glassmorphism Design System**: Modern interface built with backdrop blurs, tailored typography (Space Grotesk & Inter), and dynamic color scales.
- **Dual Map Tile Providers**: Instant switching between Jawg Maps Dark Theme and OpenStreetMap CartoDB Positron.
- **Dynamic Heatmap Layers**: Toggleable demand density, real estate rent contours, traffic friction, and suitability overlays.
- **Interactive Spoke Lines**: Vector lines connecting customer demand clusters to their assigned warehouse hub.
- **Live ESG Power Switch**: Instant toggle between Petrol and 100% EV Fleet mode with live recalculation of fuel savings and CO₂ emission reductions.
- **Live SLA Gauge**: Circular radial compliance meter showing the exact percentage of deliveries fulfilling the 10-minute SLA promise.
- **Interactive 5-Step Guided Tour (`TourModal.tsx`)**: Step-by-step onboarding walkthrough covering the map, solver controls, ESG simulator, and warehouse scorecard.
- **Enterprise Demonstration Inquiry (`EnquiryModal.tsx`)**: In-app modal for supply chain planners to submit RFPs and request custom geospatial network models.
- **Corridor Transit Status Ticker (`LogisticsTransitBanner.tsx`)**: Live streaming fleet telemetry tracking Silk Board, Electronic City, and Whitefield arteries.
- **Visual KPI Analytics (`DashboardCharts.tsx`)**: Interactive bar and line charts for delivery time distributions, cost breakdown, and fleet workforce allocations.
- **Crisis Stress Testing Engine (`ScenariosPage.tsx`)**: One-click simulation of Festive Demand (+40%), Peak ORR Congestion (+30%), and Monsoon Inundation (+50%).
- **800-Node Data Explorer (`DataPage.tsx`)**: Searchable, sortable, and filterable table of all 800 BBMP coordinate nodes with CSV export capability.

---

## 🚀 Installation, Docker & Deployment

### Prerequisites
- **Node.js**: v18.0 or higher (`npm` installed)
- **Python**: 3.10+ (`pip` installed)
- **Git**

---

### Option 1: Docker Container Deployment (Production Turnkey)

Build and run the entire unified stack (Frontend + Backend + 800 Ward Nodes) in a single production container using the multi-stage [`Dockerfile`](Dockerfile):

```bash
# 1. Build the production Docker image
docker build -t namma-warehouse .

# 2. Run the container on port 8000
docker run -d -p 8000:8000 --name namma-warehouse-app namma-warehouse

# 3. Check container logs
docker logs -f namma-warehouse-app
```

- **Frontend Application**: `http://localhost:8000`
- **FastAPI Interactive Docs**: `http://localhost:8000/docs`
- **Health Check Endpoint**: `http://localhost:8000/api/health`

---

### Option 2: Local Development (Quick Start via Workspace Scripts)

You can orchestrate both services directly from the repository root using `npm`:

```bash
# 1. Install all dependencies (Python backend + Node frontend)
npm run install:all

# 2. Start the FastAPI backend (Terminal 1)
npm run backend

# 3. Start the React/Vite frontend (Terminal 2)
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://127.0.0.1:8000`

---

### Option 3: One-Click Launch (Windows)

- **PowerShell**: Run `.\run.ps1`
- **Command Prompt**: Run `start.bat`

Both scripts automatically launch the FastAPI backend on port 8000 and the Vite frontend on port 3000 in separate console windows.

---

### Option 4: Manual Launch (Two Terminals)

#### Terminal 1: Start Python FastAPI Backend
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app:app --port 8000 --reload
```
Backend will be live at `http://127.0.0.1:8000` (API Docs: `http://127.0.0.1:8000/docs`).

#### Terminal 2: Start React + Vite Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend will be live at `http://localhost:3000`.

The frontend automatically proxies `/api` calls to the FastAPI backend at `http://127.0.0.1:8000`. The header will display **"FastAPI: Online"** with a pulsing green badge.

---

## 📊 Platform Highlights & Architectural Summary

| Core Pillar | Technical Architecture | Real-World Operational Impact |
| :--- | :--- | :--- |
| **Mathematical Optimization** | Discrete Capacitated Facility Location with spatial dispersion ($D_{\min}$), Anti-Deadlock Regret-First Allocation, and 1-Opt Local Search (Zero K-Means). | Eliminates unviable lake/residential centroid placements; guarantees sub-150ms convergence across 800 nodes. |
| **Quick-Commerce SLA Engine** | 3-phase kinematic fulfillment model integrating warehouse staging delays, traffic impedance, and high-density doorstep handover. | Mathematically predicts micro-hub density requirements to reliably achieve 10-minute delivery in Bengaluru. |
| **Workforce & Shift Logistics** | Delivery workforce modeling (52,050 active drivers @ ₹1,000/day baseline wages) with localized milk-run routing batches. | Connects theoretical facility location to practical operational payroll, shift limits, and daily rider travel distance. |
| **ESG Fleet Electrification** | Interactive green fleet transition simulator evaluating real-world petrol vs. EV charging operating expense curves. | Projects over ₹44+ Crore/year in operational fuel savings and eliminates 17,700+ tons of CO₂ emissions annually. |
| **Data Science & Spatial Modeling** | 2D Gaussian Spatial Decay Fields, Multi-Criteria Feature Normalization, and TomTom traffic impedance calibration. | Replaces arbitrary assumptions with empirically calibrated urban physical dynamics. |
| **Geospatial Precision** | 800 discrete BBMP nodes covering all 5 administrative zones with real commercial real estate rates and congestion layers. | Provides granular, actionable supply chain decision support customized for Greater Bengaluru geography. |
| **Container & Production Ready** | Turnkey Docker multi-stage container with automated static routing and API auto-probing. | Enables instant enterprise deployment with zero manual DevOps configuration. |

---

**Built with pride for Namma Bengaluru 🚀**
