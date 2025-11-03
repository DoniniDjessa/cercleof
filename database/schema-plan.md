# Beauty Institute Management System - Database Schema Plan

## Core Tables with 'dd-' prefix

### 1. dd-users (Users/Staff Management)
- **Purpose**: Manage all staff members and their roles
- **Roles**: superadmin, admin, manager, caissiere, employe
- **Key Fields**: auth_user_id, email, first_name, last_name, role, salary, commission_rate

### 2. dd-clients (Client Management)
- **Purpose**: Store client information and preferences
- **Key Fields**: first_name, last_name, phone, email, birth_date, preferences, loyalty_points

### 3. dd-products (Product Inventory)
- **Purpose**: Manage beauty products inventory
- **Key Fields**: name, description, category, price, cost, stock_quantity, supplier, expiry_date

### 4. dd-services (Service Catalog)
- **Purpose**: Define available beauty services
- **Key Fields**: name, description, category, duration, price, commission_rate

### 5. dd-appointments (Appointment Management)
- **Purpose**: Schedule and track client appointments
- **Key Fields**: client_id, service_id, employee_id, appointment_date, status, notes

### 6. dd-transactions (POS Transactions)
- **Purpose**: Record all sales transactions
- **Key Fields**: transaction_type (sale/refund), total_amount, payment_method, cashier_id, client_id

### 7. dd-transaction_items (Transaction Line Items)
- **Purpose**: Detailed items in each transaction
- **Key Fields**: transaction_id, item_type (product/service), item_id, quantity, unit_price, total_price

### 8. dd-inventory_movements (Inventory Tracking)
- **Purpose**: Track product stock movements
- **Key Fields**: product_id, movement_type (in/out), quantity, reason, reference_id

### 9. dd-deliveries (Delivery Management)
- **Purpose**: Track product deliveries and orders
- **Key Fields**: supplier, delivery_date, status, total_cost, received_by

### 10. dd-expenses (Expense Management)
- **Purpose**: Track business expenses
- **Key Fields**: category, amount, description, date, approved_by, receipt_url

### 11. dd-salary_payments (Employee Payments)
- **Purpose**: Track employee salary and commission payments
- **Key Fields**: employee_id, payment_date, base_salary, commission, total_amount

### 12. dd-sms_campaigns (SMS Marketing)
- **Purpose**: Manage bulk SMS campaigns
- **Key Fields**: campaign_name, message, target_audience, sent_count, scheduled_date

### 13. dd-analytics_daily (Daily Analytics)
- **Purpose**: Store daily performance metrics
- **Key Fields**: date, total_sales, total_clients, total_appointments, total_expenses

### 14. dd-analytics_monthly (Monthly Analytics)
- **Purpose**: Store monthly performance metrics
- **Key Fields**: year, month, total_revenue, total_expenses, profit, client_count

## Relationships
- Users can have multiple appointments (as employees)
- Clients can have multiple appointments and transactions
- Transactions can have multiple transaction_items
- Products have inventory_movements
- Services are linked to appointments

## Security Considerations
- Row Level Security (RLS) enabled on all tables
- Role-based access control
- Audit trails for sensitive operations
- Data encryption for personal information
