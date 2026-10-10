# Quick API tests

Base URL: http://localhost:8082/api

## 1. Health
GET http://localhost:8082/api/health

## 2. Register
POST http://localhost:8082/api/auth/register
Content-Type: application/json

{
  "name": "Test User",
  "email": "test@example.com",
  "password": "Test@12345"
}

Copy the returned `token`.

## 3. Login
POST http://localhost:8082/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test@12345"
}

## 4. Add car
POST http://localhost:8082/api/vehicles
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "vehicleNumber": "TS09AB1234",
  "vehicleType": "CAR",
  "brand": "Honda",
  "model": "City",
  "purchaseDate": "2025-01-15",
  "currentMileage": 18500
}

## 5. Add bike
POST http://localhost:8082/api/vehicles
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "vehicleNumber": "TS09CD5678",
  "vehicleType": "BIKE",
  "brand": "Honda",
  "model": "Activa",
  "purchaseDate": "2024-08-10",
  "currentMileage": 18500
}

## 6. Add service record
POST http://localhost:8082/api/service-records/vehicle/1
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "serviceDate": "2026-08-15",
  "serviceType": "GENERAL SERVICE",
  "mileage": 18000,
  "description": "Oil and inspection",
  "cost": 8500,
  "nextServiceDate": "2026-11-15"
}

## 7. Reminder
GET http://localhost:8082/api/service-records/vehicle/1/reminder
Authorization: Bearer YOUR_TOKEN
