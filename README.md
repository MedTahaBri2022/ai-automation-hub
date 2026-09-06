# AI Automation Hub

AI Automation Hub is a full-stack AI-powered platform designed to automate
business and marketing workflows through specialized AI agents.

## Features

- AI-powered document processing
- Structured information extraction
- Data analysis and automated insights
- AI content generation
- Modular agent architecture
- REST API integration
- Full-stack web interface

## Architecture

Frontend → REST API → AI Agents → LLM Services → Database

## Tech Stack

### Backend
- Python
- FastAPI
- REST API

### Frontend
- Next.js
- React
- TypeScript

### Database
- PostgreSQL

### AI
- Large Language Models (LLMs)
- Prompt Engineering

### DevOps
- Docker
- Git / GitHub

## Project Structure

backend/
frontend/
docker-compose.yml

## Installation

### Backend

cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload

### Frontend

cd frontend
npm install
npm run dev