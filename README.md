# Seesaw Physics

Seesaw Physics is a tiny web playground that visualizes basic torque
relationships on a seesaw. Drop weighted blocks anywhere along the plank,
watch the balances change in real time, and inspect the calculated moments
until the system finds a new equilibrium.

## Features

- Fully client-side experience built with plain HTML, CSS, and JavaScript
- Hover preview that shows where the next object will land before you click
- Randomized weights (1–10 kg) and colors so every drop is unique
- Live readouts for left/right weight totals, upcoming object, and seesaw angle
- Physics calculations based on torque differences, capped at ±30°
- Smooth easing animation, ambient UI sound, and running log of each action
- LocalStorage persistence so reloading the page restores the last setup

## Controls

- **Hover** over the plank to preview the next object's landing spot.
- **Click** to drop the current object at the highlighted position.
- **Reset** to clear every object, generate a new next weight, and zero the
  seesaw.

## Run Locally

1. Clone the repo and move into it.
   ```bash
   git clone https://github.com/emrecankaracayir/seesaw-physics.git
   cd seesaw-physics
   ```
2. Serve the directory with any static server (or just open `index.html`). A
   couple of simple options:
   ```bash
   # Using npm's serve (install globally once)
   npm install -g serve
   serve .

   # Or with Python 3's built-in HTTP server
   python3 -m http.server 5173
   ```
3. Visit the printed URL in a modern desktop browser. Everything runs locally
   without additional dependencies.

## Project Layout

- `index.html` – Shell page that wires up the UI components
- `public/styles.css` – Layout, theme variables, and component-level styles
- `public/script.js` – Simulation logic, rendering, persistence, and audio

## How the Simulation Works

- Every dropped object stores its distance from the pivot (in pixels) and
  weight (in kg).
- On each update, left and right torques are calculated by summing
  `weight * distance` for the respective side.
- The target angle is derived from the torque difference (`(τR - τL) / 10`) and
  clamped so the plank never exceeds ±30°.
- A lightweight easing loop interpolates between the current and target angle
  so the movement feels physical instead of jumpy.
- State is persisted in `localStorage` (`seesaw-physics-state-v1`) so refreshing
  the page reloads your stacked objects along with the upcoming weight/color.

## License

Released under the MIT License. See `LICENSE.md` for details.
