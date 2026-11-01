PROJECT AETHER — SPACE ESCAPE
==============================

HOW TO RUN
1. Extract this ZIP file.
2. Open the extracted folder in Visual Studio Code.
3. Install the "Live Server" extension if you do not already have it.
4. Right-click index.html and select "Open with Live Server".
5. The game opens in your browser. Click START MISSION.

CONTROLS
- W A S D or Arrow Keys: Move
- SPACE: Shoot hostile drones
- E: Interact with nearby objects
- ESC: Pause / resume

MISSION FLOW
1. In the Bridge, collect the glowing yellow access key.
2. Move to the right-hand door to enter the Power Core.
3. Approach the terminal and press E.
4. Solve the Fish Game API puzzle to restore power.
5. Move right into the Research Lab and collect the purple data crystal.
6. Move right into the Escape Bay and interact with the escape pod.
7. Avoid or shoot the hostile drones. Drone collisions reduce suit energy.

FISH GAME API
The security terminal requests a live puzzle from:
https://marcconrad.com/uob/fish/api.php?out=json

The API response supplies the puzzle image (question) and expected answer (fish).
The API puzzle requires an internet connection. If the provider blocks browser
cross-origin requests (CORS), the puzzle may not load directly in the browser.
For a final submission, use a small Node.js/Express backend proxy if required.

FILES
- index.html : page structure and screens
- style.css  : all styling and responsive layout
- script.js  : game logic, controls, collision, navigation and API integration

This is a front-end playable prototype. It does not include user accounts,
database storage or server-side answer validation.


LOGIN / REGISTER
- The game now opens with Login and Register.
- Register with a crew name, email and password (minimum 6 characters).
- Then login with the same email and password.
- A demo session is remembered in this browser.
- IMPORTANT: this is front-end demonstration authentication only. Account
  details are stored in browser localStorage. Do not use real or reused
  passwords. For a production or assessed full-stack system, use a backend,
  database, password hashing and server-side session handling.
