# Dynamic domain map

- What is it?
  - A dynamic map showing how topics in a domain/field are structured, based on an easily editable json file
- But what it is?
  - Bubbles with custom text that will try to organize themselves without overlap (but will need a little bit of user interaction to truly get there). They can be drawn into cool looking maps with a flew mouse clicks, moved and zoomed and everything..  

Use it in action <a href="https://stl-tec.de/dynamic-map/" target="_blank">here!</a>  (maybe check below in "how to use" first)

![2025-04-08 21_29_31-Leap-01 - VMware Workstation](https://github.com/user-attachments/assets/4b594494-4aca-4125-9653-921b2b749936)

Based on the idea of a Cybersecurity Domain Map by Henry Jiang
https://www.linkedin.com/pulse/cybersecurity-domain-map-ver-30-henry-jiang/

- It draws a map defined in a json file as a D3JS force graph
- It has nothing to do with cybersecurity really, that was just the inspiration and the prime and currently only example
- The graph tries to untangle itself, but usually needs some help in drawing the main branches around a bit until it fits the sceen
- The "reset" button creates a new starting point, it can randomly create a fairly good version but adjusting by hand is usually quicker

## How to: install
- Copy everything to a webspace or use for example python to launch locally (python3 -m http.server 8000)

## How to: customize
- Change the json to your liking or create a new one and change the reference in map.js "d3.json()"

## How to: use
- Open in browser
- Drag nodes around until the graph is fully untangled, usually it is enough to just draw one node of each color outwards the rest will adjust itself. 
- Use **shift while dragging** fixates nodes or entire subgraphs for final adjustments
- **Zoom via mouse wheel**
- **Dragging nodes without shift** resets them to the original (force directed) behaviour, thats typically not what you want
- If you want to **move the entire graph** either use shift-drag to fixate the entire graph or **click on an empty space to shift everything around**. 
- (Dragging the central node in force directed mode is only really useful if you don't want it in the middle)

## Additional

- The helpers folder contains a script to turn yml format into json, it uses **pyyaml**
(only tested in a limited fashion, I think the json format is much easier to edit and keep track of nesting)
