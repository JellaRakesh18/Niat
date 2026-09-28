/**
 * Mazdoor Mitra - Supabase Cloud Synchronization Engine
 * Project URL: https://eeocbfsgsqpymnnnzcmk.supabase.co
 */

const MM_SUPABASE_CONFIG = {
  url: "https://eeocbfsgsqpymnnnzcmk.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb2NiZnNnc3FweW1ubm56Y21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MDcyNjAsImV4cCI6MjEwNjE4MzI2MH0.jjzrmJxFVcw0cgUgp3gfTu_9hvxE87xTthjzXMlpxmw"
};

let mmSupabaseClient = null;
let mmSupabaseStatus = "connecting"; // "connected", "synced", "pending_tables", "offline"

function initMazdoorSupabase() {
  try {
    if (window.supabase && window.supabase.createClient) {
      mmSupabaseClient = window.supabase.createClient(MM_SUPABASE_CONFIG.url, MM_SUPABASE_CONFIG.anonKey);
      console.log("⚡ Supabase Client initialized successfully:", MM_SUPABASE_CONFIG.url);
      updateSupabaseUIBadge("Connected", "emerald");
      syncAllFromSupabase();
      setupSupabaseRealtimeSubscriptions();
    } else {
      console.warn("Supabase library not ready yet, retrying...");
      setTimeout(initMazdoorSupabase, 800);
    }
  } catch (err) {
    console.error("Supabase init error:", err);
    updateSupabaseUIBadge("Error", "red");
  }
}

function updateSupabaseUIBadge(statusText, color = "emerald") {
  const badgeText = document.getElementById("supabaseStatusText");
  const badgeDot = document.getElementById("supabaseStatusDot");
  if (badgeText) badgeText.innerText = statusText;
  if (badgeDot) {
    badgeDot.className = `w-2 h-2 rounded-full bg-${color}-500 ${color === 'emerald' ? 'animate-pulse' : ''}`;
  }
  const statusDetail = document.getElementById("supabaseModalStatusText");
  if (statusDetail) {
    statusDetail.innerText = statusText;
  }
}

async function syncAllFromSupabase(isManual = false) {
  if (!mmSupabaseClient) return;

  try {
    // 1. SYNC JOBS
    const { data: dbJobs, error: jobsErr } = await mmSupabaseClient
      .from('jobs')
      .select('*')
      .order('id', { ascending: false });

    if (jobsErr) {
      if (jobsErr.code === '42P01' || jobsErr.message?.includes('relation "public.jobs" does not exist') || jobsErr.status === 404) {
        console.info("⚡ Supabase connected! Waiting for tables to be created in SQL Editor.");
        updateSupabaseUIBadge("Pending SQL Setup", "amber");
        const tipEl = document.getElementById("supabaseSetupTip");
        if (tipEl) tipEl.classList.remove("hidden");
        if (isManual && typeof showToast === "function") {
          showToast("Tables Pending", "Please execute the SQL script in Supabase SQL Editor to enable tables.");
          if (typeof openModal === "function") openModal("supabaseModal");
        }
        return;
      }
      console.warn("Supabase jobs fetch error:", jobsErr);
    } else {
      updateSupabaseUIBadge("Cloud Synced", "emerald");
      const tipEl = document.getElementById("supabaseSetupTip");
      if (tipEl) tipEl.classList.add("hidden");

      if (dbJobs && dbJobs.length > 0) {
        const mappedJobs = dbJobs.map(j => ({
          id: j.id,
          title: j.title,
          trade: j.trade,
          employer: j.employer,
          employerPhone: j.employer_phone || j.phone || "9876543210",
          phone: j.phone || j.employer_phone || "9876543210",
          workersNeeded: j.workers_needed || 1,
          wage: j.wage,
          startDate: j.start_date || j.posted_date || new Date().toISOString().split('T')[0],
          hours: j.hours || "8 hours",
          shiftHours: j.hours || "8 hours",
          state: j.state,
          district: j.district,
          city: j.city,
          description: j.description || "",
          postedDate: j.posted_date || new Date().toISOString().split('T')[0],
          isScam: j.is_scam || false
        }));

        if (typeof appState !== "undefined" && appState) {
          appState.jobs = mappedJobs;
          if (typeof saveStateToStorage === "function") saveStateToStorage();
          if (typeof renderJobs === "function") renderJobs();
          if (typeof renderAnalytics === "function") renderAnalytics();
        }
      } else if (dbJobs && dbJobs.length === 0 && typeof DEFAULT_SEED_DATA !== "undefined" && DEFAULT_SEED_DATA.jobs) {
        // First run on empty table: auto-seed jobs into cloud
        seedCloudJobs();
      }
    }

    // 2. SYNC WORKERS
    const { data: dbWorkers, error: workErr } = await mmSupabaseClient
      .from('workers')
      .select('*')
      .order('id', { ascending: false });

    if (!workErr && dbWorkers && dbWorkers.length > 0 && typeof appState !== "undefined" && appState) {
      appState.workers = dbWorkers.map(w => ({
        id: w.id,
        name: w.name,
        phone: w.phone,
        trade: w.trade,
        wage: w.wage,
        experience: w.experience || 1,
        status: w.status || "Available",
        state: w.state,
        district: w.district,
        city: w.city,
        verified: w.verified !== false,
        photoSkillVerified: w.photo_skill_verified !== false
      }));
      if (typeof saveStateToStorage === "function") saveStateToStorage();
      if (typeof renderWorkers === "function") renderWorkers();
    } else if (!workErr && dbWorkers && dbWorkers.length === 0 && typeof DEFAULT_SEED_DATA !== "undefined" && DEFAULT_SEED_DATA.workers) {
      seedCloudWorkers();
    }

    // 3. SYNC APPLICATIONS
    const { data: dbApps, error: appErr } = await mmSupabaseClient
      .from('applications')
      .select('*')
      .order('id', { ascending: false });

    if (!appErr && dbApps && dbApps.length > 0 && typeof appState !== "undefined" && appState) {
      appState.applications = dbApps.map(a => ({
        id: a.id,
        jobId: a.job_id,
        jobTitle: a.job_title,
        workerName: a.worker_name,
        workerPhone: a.worker_phone,
        workerTrade: a.worker_trade,
        status: a.status || "Submitted",
        appliedDate: a.applied_date || new Date().toISOString().split('T')[0]
      }));
      if (typeof saveStateToStorage === "function") saveStateToStorage();
      if (typeof renderApplications === "function") renderApplications();
    }

    // 4. SYNC ATTENDANCE
    const { data: dbAtt, error: attErr } = await mmSupabaseClient
      .from('attendance')
      .select('*')
      .order('id', { ascending: false });

    if (!attErr && dbAtt && dbAtt.length > 0 && typeof appState !== "undefined" && appState) {
      appState.attendanceLogs = dbAtt.map(at => ({
        id: at.id,
        workerName: at.worker_name,
        date: at.date,
        timestamp: at.timestamp || `${at.date} 08:30:00`,
        site: at.location || "Site Work",
        type: at.type || "Check-In",
        verified: at.verified !== false
      }));
      if (typeof saveStateToStorage === "function") saveStateToStorage();
      if (typeof renderAttendanceLogs === "function") renderAttendanceLogs();
    }

    if (isManual && typeof showToast === "function") {
      showToast("Cloud Synced", "All jobs, workers, and records successfully synced with Supabase!");
    }
  } catch (err) {
    console.warn("Supabase sync exception:", err);
  }
}

async function seedCloudJobs() {
  if (!mmSupabaseClient || !DEFAULT_SEED_DATA.jobs) return;
  try {
    const payload = DEFAULT_SEED_DATA.jobs.map(j => ({
      title: j.title,
      trade: j.trade,
      employer: j.employer,
      employer_phone: j.employerPhone || "9876543210",
      phone: j.employerPhone || "9876543210",
      wage: j.wage,
      workers_needed: j.workersNeeded || 1,
      hours: j.hours || "8 hours",
      state: j.state,
      district: j.district,
      city: j.city,
      description: j.description || "",
      posted_date: j.postedDate || new Date().toISOString().split('T')[0],
      is_scam: j.isScam || false
    }));
    await mmSupabaseClient.from('jobs').insert(payload);
    console.log("Seeded initial jobs into Supabase cloud table.");
  } catch (e) {
    console.warn("Seed jobs error:", e);
  }
}

async function seedCloudWorkers() {
  if (!mmSupabaseClient || !DEFAULT_SEED_DATA.workers) return;
  try {
    const payload = DEFAULT_SEED_DATA.workers.map(w => ({
      name: w.name,
      phone: w.phone,
      trade: w.trade,
      wage: w.wage,
      experience: w.experience || 1,
      status: w.status || "Available",
      state: w.state,
      district: w.district,
      city: w.city,
      verified: w.verified !== false,
      photo_skill_verified: w.photoSkillVerified !== false
    }));
    await mmSupabaseClient.from('workers').insert(payload);
    console.log("Seeded initial workers into Supabase cloud table.");
  } catch (e) {
    console.warn("Seed workers error:", e);
  }
}

function setupSupabaseRealtimeSubscriptions() {
  if (!mmSupabaseClient) return;
  try {
    mmSupabaseClient
      .channel('mazdoor-cloud-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
        console.log("Realtime: New job event from Supabase");
        syncAllFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workers' }, () => {
        console.log("Realtime: New worker event from Supabase");
        syncAllFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        console.log("Realtime: New application event from Supabase");
        syncAllFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        console.log("Realtime: New attendance event from Supabase");
        syncAllFromSupabase();
      })
      .subscribe();
  } catch (err) {
    console.warn("Supabase Realtime subscription error:", err);
  }
}

// Global push helper functions
async function pushJobToSupabase(job) {
  if (!mmSupabaseClient) return;
  try {
    const { error } = await mmSupabaseClient.from('jobs').insert([{
      title: job.title,
      trade: job.trade,
      employer: job.employer,
      employer_phone: job.employerPhone || job.phone,
      phone: job.phone || job.employerPhone,
      wage: job.wage,
      workers_needed: job.workersNeeded || 1,
      hours: job.hours || "8 hours",
      state: job.state,
      district: job.district,
      city: job.city,
      description: job.description || "",
      posted_date: job.postedDate || new Date().toISOString().split('T')[0],
      is_scam: job.isScam || false
    }]);
    if (error) console.warn("Supabase pushJob error:", error);
    else console.log("Job successfully pushed to Supabase Cloud");
  } catch (e) {
    console.warn("Supabase pushJob exception:", e);
  }
}

async function pushWorkerToSupabase(worker) {
  if (!mmSupabaseClient) return;
  try {
    const { error } = await mmSupabaseClient.from('workers').insert([{
      name: worker.name,
      phone: worker.phone,
      trade: worker.trade,
      wage: worker.wage,
      experience: worker.experience,
      status: worker.status || "Available",
      state: worker.state,
      district: worker.district,
      city: worker.city,
      verified: worker.verified !== false,
      photo_skill_verified: worker.photoSkillVerified !== false
    }]);
    if (error) console.warn("Supabase pushWorker error:", error);
    else console.log("Worker successfully pushed to Supabase Cloud");
  } catch (e) {
    console.warn("Supabase pushWorker exception:", e);
  }
}

async function pushApplicationToSupabase(app) {
  if (!mmSupabaseClient) return;
  try {
    const { error } = await mmSupabaseClient.from('applications').insert([{
      job_id: app.jobId,
      job_title: app.jobTitle,
      worker_name: app.workerName,
      worker_phone: app.workerPhone,
      worker_trade: app.workerTrade,
      status: app.status || "Submitted",
      applied_date: app.appliedDate || new Date().toISOString().split('T')[0]
    }]);
    if (error) console.warn("Supabase pushApplication error:", error);
    else console.log("Application successfully pushed to Supabase Cloud");
  } catch (e) {
    console.warn("Supabase pushApplication exception:", e);
  }
}

async function pushAttendanceToSupabase(att) {
  if (!mmSupabaseClient) return;
  try {
    const { error } = await mmSupabaseClient.from('attendance').insert([{
      worker_name: att.workerName,
      date: new Date().toISOString().split('T')[0],
      timestamp: att.timestamp,
      type: att.type || "Check-In",
      location: att.site,
      verified: att.verified !== false
    }]);
    if (error) console.warn("Supabase pushAttendance error:", error);
    else console.log("Attendance successfully pushed to Supabase Cloud");
  } catch (e) {
    console.warn("Supabase pushAttendance exception:", e);
  }
}

async function pushIncidentToSupabase(inc) {
  if (!mmSupabaseClient) return;
  try {
    const { error } = await mmSupabaseClient.from('incidents').insert([{
      worker_name: inc.workerName,
      incident_type: inc.incidentType,
      severity: inc.severity,
      contractor_phone: inc.contractorPhone,
      location: inc.location,
      description: inc.description,
      timestamp: inc.timestamp
    }]);
    if (error) console.warn("Supabase pushIncident error:", error);
    else console.log("Incident successfully pushed to Supabase Cloud");
  } catch (e) {
    console.warn("Supabase pushIncident exception:", e);
  }
}
