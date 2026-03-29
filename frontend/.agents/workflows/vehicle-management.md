---
description: Workflow for vehicle booking and renting features
---
1. **Inventory Verification**:
   - Always query the database or state management system for available vehicles first. 
   - Never generate fake vehicles that don't exist in the system's state.

2. **State Management**:
   - Define and enforce clear states for vehicles: `Available`, `Booked`, `Rented`, `Maintenance`.
   - Before confirming any booking or rental, verify the current state is `Available`.
   - Explicitly update the state in the data store upon action completion.

3. **Conflict Resolution**:
   - Implement checks to prevent double-booking.
   - Ensure transaction safety (e.g., using DB transactions or mutexes) to verify availability immediately before confirming a rent/book.

4. **Pricing Calculation**:
   - Retrieve base prices from the data store. Do not invent arbitrary pricing rules.
   - If dynamic pricing or discounts are used, implement them based strictly on user-defined formulas or database configurations.
