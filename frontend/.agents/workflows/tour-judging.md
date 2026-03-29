---
description: Workflow for the AI-assisted tour judging and scoring system
---
1. **Predictable Input Validation**:
   - Define an exact schema for destination input (e.g., coordinates, city, date, duration).
   - Reject inputs that do not match the defined schema.

2. **External Factor Calculation**:
   - Identify the external factors to calculate (weather, traffic, safety, points of interest).
   - Use defined algorithms or designated external API calls instead of hallucinating factor values. 
   - Always retrieve real data or use a deterministic mock explicitly provided by the user.

3. **Scoring Model Implementation**:
   - Apply a strict, documented mathematical formula for the score (e.g., `(Weather * 0.4) + (Safety * 0.4) + (Traffic * 0.2)`).
   - Never use non-deterministic generation for the final score. The score must be perfectly reproducible given the same inputs and external factors.

4. **Explainable UI Integration**:
   - Connect the output score to the UI frontend.
   - Ensure the UI prominently displays *how* the score was calculated (showing the breakdown of factors) to avoid "black box" hallucination impressions.
