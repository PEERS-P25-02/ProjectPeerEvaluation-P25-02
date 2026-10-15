# Backend Dockerfile Validation

## Issue

GitHub Issue #25 - Create and validate the backend Dockerfile.

## Goal

The goal of this work is to run the PEERS backend inside Docker and confirm that it can connect to MongoDB and Mailpit without storing secrets inside the Docker image.

## Backend Image

The backend Docker image is built from:

`src/backend/Dockerfile`

Build command:

```bash
docker build -t peers-backend ./src/backend