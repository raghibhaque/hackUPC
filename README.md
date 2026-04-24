# 🚀 SchemaSync  
**Schema reconciliation in seconds, not days.**

---

## 🧠 Overview

SchemaSync is a full-stack system that **automatically reconciles two arbitrary database schemas** and produces:

- A **confidence-scored equivalence graph**
- A **table + column mapping**
- A **conflict analysis report**
- A **migration scaffold (SQL)**

It transforms what is normally a **manual, error-prone, multi-day engineering task** into a **fully automated pipeline that runs in seconds**.

---

## ⚡ The Problem

Every time systems need to integrate (e.g., acquisitions, migrations, platform unification):

- “users” vs “wp_users” vs “accounts”  
- `created_at` vs `registered_on`  
- Different types, constraints, naming conventions  

This forces engineers to:
1. Manually inspect schemas  
2. Infer semantic meaning  
3. Resolve conflicts  
4. Write migration logic  

This process is:
- Slow (days–weeks)  
- Expensive (senior engineers only)  
- Inconsistent (depends on human judgment)  

---

## 💡 The Solution

SchemaSync introduces a **3-layer reconciliation engine**:

### 1. Structural Analysis
Extracts a **format-agnostic fingerprint** of tables:
- Primary key strategy  
- Foreign key density  
- Audit columns (`created_at`, `updated_at`)  
- Junction table detection  

### 2. Semantic Matching
Uses transformer embeddings (**sentence-transformers**) to understand meaning:
- Column names  
- Table context  
- Relationships between fields  

### 3. Optimal Assignment
Uses the **Hungarian Algorithm (scipy)** to compute the **globally optimal mapping** between tables and columns.

---

## 🔁 Pipeline

Upload → Parse → Analyze → Match → Detect Conflicts → Generate SQL

---

## 🧩 Features

- Upload SQL schemas  
- Real-time progress pipeline  
- Visual equivalence graph  
- Column-level comparison  
- Conflict detection  
- Auto-generated migration scaffold  

---

## 🏗️ Architecture

### Backend
- FastAPI
- sqlglot
- sentence-transformers
- scipy
- networkx
- jinja2

### Frontend
- React + TypeScript
- Cytoscape.js
- Axios

---

## 🛠️ Setup

### Backend
```
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```
cd frontend
npm install
npm run dev
```

---

## 🚀 Future Work

- LLM-powered transformations  
- NoSQL support  
- Live database connectors  
- UI conflict resolution