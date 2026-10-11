
const API_BASE = "http://127.0.0.1:8000";

let currentUser = "";
let currentDepartment = "";
let allLeads = [];
let supportAudioFinished = false;

const $ = id => document.getElementById(id);

function value(id) {
    return $(id)?.value?.trim() || "";
}

function message(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
}

function escapeHtml(input) {
    const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    };

    return String(input ?? "").replace(
        /[&<>"']/g,
        char => entities[char]
    );
}

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, options);

    let data = {};
    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        throw new Error(
            data.detail || data.message || `HTTP ${response.status}`
        );
    }

    return data;
}

function departmentName(role) {
    const names = {
        marketing: "Marketing",
        communication: "Communication",
        vigilance: "Vigilance",
        support: "Support",
        sales: "Sales"
    };

    return names[String(role || "").toLowerCase()] || role || "";
}

function showDashboard() {
    $("loginPage").style.display = "none";
    $("dashboardPage").style.display = "block";

    $("departmentTitle").textContent =
        `${departmentName(currentDepartment)} Dashboard`;

    $("welcomeUser").textContent = `Welcome, ${currentUser}`;
    $("roleLabel").textContent = departmentName(currentDepartment);

    showDepartmentSections();
}

function showDepartmentSections() {
    const role = currentDepartment.toLowerCase();

    ["marketing", "communication", "vigilance", "support", "sales"]
        .forEach(department => {
            const section = $(`${department}Section`);

            if (section) {
                section.style.display =
                    role === department ? "block" : "none";
            }
        });
}

function getLead(id) {
    return allLeads.find(lead => String(lead.id) === String(id));
}

function appointment(lead) {
    return `${escapeHtml(lead.appointment_date || "Not specified")} ${
        escapeHtml(lead.appointment_time || "")
    }`;
}

// LOGIN

async function login(event) {
    event.preventDefault();

    const selectedDepartment = value("username");
    const password = $("password").value;

    const usernames = {
        marketing: "marketing@vibhanu.com",
        communication: "communication@vibhanu.com",
        vigilance: "vigilance@vibhanu.com",
        support: "support@vibhanu.com",
        sales: "sales@vibhanu.com"
    };

    const button = $('loginForm').querySelector(
        'button[type="submit"]'
    );

    message("loginMessage", "Signing in...");
    if (button) button.disabled = true;

    try {
        const data = await apiRequest("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: usernames[selectedDepartment] || selectedDepartment,
                password
            })
        });

        currentUser = data.username;
        currentDepartment = String(data.role || selectedDepartment)
            .toLowerCase();

        localStorage.setItem("crmUser", currentUser);
        localStorage.setItem("crmDepartment", currentDepartment);

        showDashboard();
        message("loginMessage", "");

        // Login succeeds even if loading the lead list fails.
        await refreshLeads();

    } catch (error) {
        message("loginMessage", `Login failed: ${error.message}`);
    } finally {
        if (button) button.disabled = false;
    }
}

function logout() {
    currentUser = "";
    currentDepartment = "";
    allLeads = [];
    supportAudioFinished = false;

    localStorage.removeItem("crmUser");
    localStorage.removeItem("crmDepartment");

    $("dashboardPage").style.display = "none";
    $("loginPage").style.display = "block";
    $("password").value = "";

    message("loginMessage", "");
    message("dashboardMessage", "");
    message("supportMessage", "");
}

// LEAD DROPDOWNS

function populateLeadSelect(id, leads, placeholder) {
    const select = $(id);
    if (!select) return;

    const previousValue = select.value;

    select.innerHTML = `
        <option value="">${escapeHtml(placeholder)}</option>
        ${leads.map(lead => `
            <option value="${Number(lead.id)}">
                #${Number(lead.id)} — ${escapeHtml(lead.customer_name)}
                (${escapeHtml(lead.status || "New")})
            </option>
        `).join("")}
    `;

    if (leads.some(lead => String(lead.id) === previousValue)) {
        select.value = previousValue;
    }
}

// MARKETING

async function createLead(event) {
    event.preventDefault();

    if (currentDepartment !== "marketing") return;

    const customerName = value("customerName");
    const contact = value("contact");

    if (!customerName || !contact) {
        message("dashboardMessage", "Enter the customer name and contact.");
        return;
    }

    try {
        await apiRequest("/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customer_name: customerName,
                contact
            })
        });

        $("marketingForm").reset();
        message("dashboardMessage", "Lead created successfully.");
        await refreshLeads();

    } catch (error) {
        message("dashboardMessage", `Create lead failed: ${error.message}`);
    }
}

// COMMUNICATION

function fillCommunicationDetails() {
    const lead = getLead(value("communicationLead"));
    if (!lead) return;

    $("communicationName").value = lead.customer_name || "";
    $("address").value = lead.address || "";
    $("appointmentDate").value = lead.appointment_date || "";
    $("appointmentTime").value = lead.appointment_time || "";
    $("remarks").value = lead.remarks || "";
}

async function updateCommunication(event) {
    event.preventDefault();

    const id = value("communicationLead");
    if (!id) {
        message("dashboardMessage", "Please select a lead.");
        return;
    }

    try {
        await apiRequest(
            `/leads/${encodeURIComponent(id)}/communication`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customer_name: value("communicationName"),
                    address: value("address"),
                    appointment_date: value("appointmentDate"),
                    appointment_time: value("appointmentTime"),
                    remarks: value("remarks")
                })
            }
        );

        message("dashboardMessage", "Customer details saved successfully.");
        await refreshLeads();

    } catch (error) {
        message("dashboardMessage", `Update failed: ${error.message}`);
    }
}

// VIGILANCE

function fillVigilanceDetails() {
    const lead = getLead(value("vigilanceLead"));
    if (!lead) return;

    $("vigilanceName").value = lead.customer_name || "";
    $("vigilanceAddress").value = lead.address || "";
    $("vigilanceDate").value = lead.appointment_date || "";
    $("vigilanceTime").value = lead.appointment_time || "";
    $("vigilanceRemarks").value = lead.remarks || "";
}

async function uploadVigilanceAudio(event) {
    event.preventDefault();

    const id = value("vigilanceLead");
    const file = $("audioFile").files[0];

    if (!id || !file) {
        message("dashboardMessage", "Select a lead and an audio file.");
        return;
    }

    const lead = getLead(id);
    if (!lead) {
        message("dashboardMessage", "Lead not found. Refresh the leads.");
        return;
    }

    const allowed = /\.(mp3|mpeg|mpg|wav|m4a|aac|ogg|webm)$/i;

    if (!allowed.test(file.name)) {
        message("dashboardMessage", "Unsupported audio file extension.");
        return;
    }

    const formData = new FormData();

    formData.append("customer_name", value("vigilanceName") || lead.customer_name || "");
    formData.append("address", value("vigilanceAddress") || lead.address || "");
    formData.append("appointment_date", value("vigilanceDate") || lead.appointment_date || "");
    formData.append("appointment_time", value("vigilanceTime") || lead.appointment_time || "");
    formData.append("remarks", value("vigilanceRemarks") || lead.remarks || "");
    formData.append("audio", file);

    try {
        await apiRequest(
            `/leads/${encodeURIComponent(id)}/vigilance`,
            {
                method: "POST",
                body: formData
            }
        );

        $("vigilanceForm").reset();
        message("dashboardMessage", "Verification details and audio saved.");
        await refreshLeads();

    } catch (error) {
        message("dashboardMessage", `Upload failed: ${error.message}`);
    }
}

// SUPPORT

function updateSupportAudio() {
    const id = value("supportLead");
    const lead = getLead(id);
    const container = $("supportAudio");

    supportAudioFinished = false;

    $("verifyLeadButton").disabled = true;
    $("rejectLeadButton").disabled = true;

    if (!container) return;

    if (!lead || !lead.audio_path) {
        container.innerHTML = "<p>No audio available for this lead.</p>";
        return;
    }

    container.innerHTML = `
        <p>Listen to the complete recording before reviewing this lead.</p>
        <audio id="supportAudioPlayer" controls preload="none">
            <source src="${API_BASE}/leads/${Number(lead.id)}/audio">
            Your browser does not support audio playback.
        </audio>
    `;

    const player = $("supportAudioPlayer");

    player.addEventListener("ended", () => {
        supportAudioFinished = true;
        $("verifyLeadButton").disabled = false;
        $("rejectLeadButton").disabled = false;
        message("supportMessage", "Audio finished. You can now verify or reject.");
    });
}

async function verifyLead(verified) {
    const id = value("supportLead");
    const lead = getLead(id);

    if (!lead) {
        message("supportMessage", "Please select a valid lead.");
        return;
    }

    if (!supportAudioFinished) {
        message("supportMessage", "Please listen to the full audio first.");
        return;
    }

    try {
        await apiRequest(`/leads/${encodeURIComponent(id)}/support`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ verified })
        });

        message(
            "supportMessage",
            verified ? "Lead verified successfully." : "Lead rejected."
        );

        await refreshLeads();

    } catch (error) {
        message("supportMessage", `Action failed: ${error.message}`);
    }
}

// SALES

async function claimLead(id) {
    const lead = getLead(id);

    if (!lead || !lead.audio_path) {
        message("dashboardMessage", "This lead has no uploaded audio.");
        return;
    }

    try {
        await apiRequest(`/leads/${encodeURIComponent(id)}/claim`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: currentUser })
        });

        message("dashboardMessage", "Lead claimed successfully.");
        await refreshLeads();

    } catch (error) {
        message("dashboardMessage", `Claim failed: ${error.message}`);
    }
}

function renderSalesLeads() {
    const container = $("salesLeads");
    if (!container) return;

    const leads = allLeads.filter(lead =>
        lead.audio_path &&
        ["Allocated to Sales", "Claimed by Sales"].includes(lead.status)
    );

    if (!leads.length) {
        container.innerHTML = "<p>No leads are available for Sales yet.</p>";
        return;
    }

    container.innerHTML = leads.map(lead => `
        <div class="lead-card">
            <h3>${escapeHtml(lead.customer_name)} (#${Number(lead.id)})</h3>
            <p>Contact: ${escapeHtml(lead.contact || "")}</p>
            <p>Address: ${escapeHtml(lead.address || "Not specified")}</p>
            <p>Appointment: ${appointment(lead)}</p>
            <p>Status: ${escapeHtml(lead.status)}</p>
            <audio controls preload="none">
                <source src="${API_BASE}/leads/${Number(lead.id)}/audio">
            </audio>
            ${lead.status === "Allocated to Sales"
                ? `<button type="button" onclick="claimLead(${Number(lead.id)})">Claim Lead</button>`
                : `<p>Claimed by: ${escapeHtml(lead.claimed_by || "Sales")}</p>`
            }
        </div>
    `).join("");
}

// ALL LEADS

function renderAllLeads() {
    const container = $("leadsList");
    if (!container) return;

    $("leadCount").textContent = allLeads.length;

    if (!allLeads.length) {
        container.innerHTML = "<p>No leads found.</p>";
        return;
    }

    container.innerHTML = allLeads.map(lead => `
        <div class="lead-card">
            <h3>${escapeHtml(lead.customer_name)} (#${Number(lead.id)})</h3>
            <p>Contact: ${escapeHtml(lead.contact || "")}</p>
            <p>Address: ${escapeHtml(lead.address || "Not specified")}</p>
            <p>Appointment: ${appointment(lead)}</p>
            <p>Remarks: ${escapeHtml(lead.remarks || "None")}</p>
            <p>Status: ${escapeHtml(lead.status || "New")}</p>
            ${lead.audio_path
                ? `<audio controls preload="none"><source src="${API_BASE}/leads/${Number(lead.id)}/audio"></audio>`
                : "<p>No audio uploaded.</p>"
            }
        </div>
    `).join("");
}

async function refreshLeads() {
    try {
        const data = await apiRequest("/leads");
        allLeads = Array.isArray(data) ? data : [];

        renderAllLeads();
        renderSalesLeads();

        populateLeadSelect("communicationLead", allLeads, "Select a lead");

        populateLeadSelect(
            "vigilanceLead",
            allLeads.filter(lead =>
                !["Allocated to Sales", "Claimed by Sales"].includes(lead.status)
            ),
            "Select a lead"
        );

        populateLeadSelect(
            "supportLead",
            allLeads.filter(lead =>
                lead.status === "Pending Verification" && lead.audio_path
            ),
            "Select a lead with audio"
        );

    } catch (error) {
        console.error("Could not load leads:", error);
        message("dashboardMessage", `Could not load leads: ${error.message}`);
    }
}

// EVENT LISTENERS

document.addEventListener("DOMContentLoaded", () => {
    $("loginForm")?.addEventListener("submit", login);
    $("logoutButton")?.addEventListener("click", logout);

    $("marketingForm")?.addEventListener("submit", createLead);
    $("communicationForm")?.addEventListener("submit", updateCommunication);
    $("vigilanceForm")?.addEventListener("submit", uploadVigilanceAudio);

    $("communicationLead")?.addEventListener("change", fillCommunicationDetails);
    $("vigilanceLead")?.addEventListener("change", fillVigilanceDetails);
    $("supportLead")?.addEventListener("change", updateSupportAudio);

    $("verifyLeadButton")?.addEventListener("click", () => verifyLead(true));
    $("rejectLeadButton")?.addEventListener("click", () => verifyLead(false));
    $("refreshLeadsButton")?.addEventListener("click", refreshLeads);

    const savedUser = localStorage.getItem("crmUser");
    const savedDepartment = localStorage.getItem("crmDepartment");

    if (savedUser && savedDepartment) {
        currentUser = savedUser;
        currentDepartment = savedDepartment.toLowerCase();

        showDashboard();
        refreshLeads();
    }
});
