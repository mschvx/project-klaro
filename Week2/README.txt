Project KLARO - Optimizer Web App Instructions
==============================================

How to Run the Website and Use the Optimizer
--------------------------------------------

1. **Install Node.js**
   - Download and install Node.js from https://nodejs.org/
   - This is required to run the local server.

2. **Start the Local Server**
   - Open a command prompt or PowerShell window.
   - Navigate to the project folder (where you unzipped the files):
     cd "C:\Users\<YourUsername>\Desktop\Project KLARO"
   - Run the server:
     node server.js
   - You should see a message: "Server running at http://localhost:3000/"

3. **Open the Website**
   - In your web browser (Chrome, Edge, Firefox), go to:
     http://localhost:3000/Pages/optimizer.html

4. **Use the Optimizer**
   - Select the mitigation projects you want.
   - Click the "Optimize Solution" button.
   - The selected project data will be saved automatically to `Data/ToReceive.json`.

5. **Check Results**
   - The file `Data/ToReceive.json` will contain the selected project numbers as arrays of values.
   - You can use R or any other tool to process this file.

6. **Troubleshooting**
   - If you see errors, make sure Node.js is installed and you are running the server in the correct folder.
   - Make sure you open the website using the link above (not by double-clicking the HTML file).

---

**No downloads, no popups, no extra steps. Just run the server and use the site!**
