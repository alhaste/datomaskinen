const SUPABASE_URL = "https://cpgbopfzeuxtvhnkfdzn.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZ2JvcGZ6ZXV4dHZobmtmZHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMDQ1MjQsImV4cCI6MjA5NzY4MDUyNH0.C_Eh50OiYNp0y0DyFR65zxGYGFNG3-UFYuh6vNEIwL8";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


const createMeetingButton = document.querySelector("#createMeeting");
const saveResponseButton = document.querySelector("#saveResponse");

const participantView = document.querySelector("#participantView");
const createView = document.querySelector("#createView");
const ownerView = document.querySelector("#ownerView");

const meetingName = document.querySelector("#meetingName");
const meetingText = document.querySelector("#meetingText");
const meetingDuration = document.querySelector("#meetingDuration");
const meetingPeriod = document.querySelector("#meetingPeriod");
const meetingParticipantCount = document.querySelector("#meetingParticipantCount");
const meetingTimeBlocks = document.querySelector("#meetingTimeBlocks");

const availabilityGrid = document.querySelector("#availabilityGrid");
const results = document.querySelector("#results");
const meetingLinkBox = document.querySelector("#meetingLinkBox");
const meetingLink = document.querySelector("#meetingLink");
const copyMeetingLinkButton = document.querySelector("#copyMeetingLink");
const adminLink = document.querySelector("#adminLink");
const copyAdminLinkButton = document.querySelector("#copyAdminLink");
const saveConfirmation = document.querySelector("#saveConfirmation");
const adminMeetingName = document.querySelector("#adminMeetingName");
const adminMeetingText = document.querySelector("#adminMeetingText");
const adminStatus = document.querySelector("#adminStatus");
const adminProgress = document.querySelector("#adminProgress");
const answeredList = document.querySelector("#answeredList");
const missingList = document.querySelector("#missingList");
const adminParticipantLink = document.querySelector("#adminParticipantLink");
const copyAdminParticipantLinkButton = document.querySelector("#copyAdminParticipantLink");

let meeting = {};
let selectedDuration = "";
let selectedPeriod = "";
let expectedParticipants = 0;
let selectedTimeBlocks = [];
let slots = [];
let selectedSlots = [];
let responses = [];

const urlParams = new URLSearchParams(window.location.search);
const meetingIdFromUrl = urlParams.get("meeting");
const adminIdFromUrl = urlParams.get("admin");

if (meetingIdFromUrl) {
  createView.classList.add("hidden");
  loadMeeting(meetingIdFromUrl);
}

if (adminIdFromUrl) {
  createView.classList.add("hidden");
  participantView.classList.add("hidden");
  ownerView.classList.remove("hidden");

  loadAdmin(adminIdFromUrl);
}

setupSingleChoice("#durationButtons", value => {
  selectedDuration = value;
});

setupSingleChoice("#periodButtons", value => {
  selectedPeriod = value;
});

setupSingleChoice("#participantCountButtons", value => {
  expectedParticipants = Number(value);
});

setupMultiChoice("#timeBlockButtons", values => {
  selectedTimeBlocks = values;
});

createMeetingButton.addEventListener("click", async () => {
  const title = document.querySelector("#meetingTitle").value;
  const description = document.querySelector("#meetingDescription").value;

  const customCountInput = document.querySelector("#customParticipantCount");
  const customCount = customCountInput ? Number(customCountInput.value) : 0;
  const participantCount = customCount > 10 ? customCount : expectedParticipants;

  if (
    !title ||
    !selectedDuration ||
    !selectedPeriod ||
    !participantCount ||
    selectedTimeBlocks.length === 0
  ) {
    alert("Udfyld mødenavn, varighed, periode, antal deltagere og mindst én tidsblok.");
    return;
  }

  meeting = {
  title,
  description,
  duration: selectedDuration,
  period: selectedPeriod,
  timeBlocks: selectedTimeBlocks,
  expectedParticipants: participantCount,
};

const { data, error } = await db
  .from("meetings")
  .insert({
    title: meeting.title,
    code: crypto.randomUUID(),
    description: meeting.description,
    duration: meeting.duration,
    period: meeting.period,
    time_blocks: meeting.timeBlocks,
    expected_participants: meeting.expectedParticipants,
  })
  .select()
  .single();

if (error) {
  alert("Kunne ikke gemme mødet: " + error.message);
  return;
}

const link = `${window.location.origin}${window.location.pathname}?meeting=${data.id}`;

meetingLink.value = link;

const adminUrl =
  `${window.location.origin}${window.location.pathname}?admin=${data.id}`;

adminLink.value = adminUrl;

meeting.id = data.id;
meetingLinkBox.classList.remove("hidden");

  slots = generateSlots(selectedPeriod, selectedTimeBlocks);

  meetingName.textContent = meeting.title;
renderMeetingDescription();

meetingDuration.textContent = meeting.duration;
  meetingPeriod.textContent = meeting.period;
meetingParticipantCount.textContent = meeting.expectedParticipants;
meetingTimeBlocks.textContent = meeting.timeBlocks.join(", ");

  participantView.classList.remove("hidden");
  ownerView.classList.remove("hidden");

  renderAvailability();
  renderResults();

  meetingLinkBox.scrollIntoView({ behavior: "smooth" });
  });

copyMeetingLinkButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(meetingLink.value);
  copyMeetingLinkButton.textContent = "Kopieret ✅";
});
copyAdminParticipantLinkButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(adminParticipantLink.value);
  copyAdminParticipantLinkButton.textContent = "Kopieret ✅";
});

copyAdminLinkButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(adminLink.value);
  copyAdminLinkButton.textContent = "Kopieret ✅";
});
saveResponseButton.addEventListener("click", async () => {
  const name = document.querySelector("#participantName").value;

  if (!name) {
    alert("Skriv dit navn først.");
    return;
  }

  if (selectedSlots.length === 0) {
    alert("Vælg mindst én mulighed.");
    return;
  }

  const meetingId = meetingIdFromUrl || meeting.id;

  const { error } = await db
    .from("responses")
    .insert({
      meeting_id: meetingId,
      participant_name: name,
      dates: selectedSlots,
    });

  if (error) {
    alert("Kunne ikke gemme svar: " + error.message);
    return;
  }

  responses.push({
    name,
    slots: [...selectedSlots],
  });
  saveConfirmation.classList.remove("hidden");
  saveResponseButton.disabled = true;
  saveResponseButton.textContent = "Svar gemt ✅";


  selectedSlots = [];
  document.querySelector("#participantName").value = "";

  renderAvailability();
  renderResults();
});

function renderMeetingDescription() {
  meetingText.textContent = meeting.description || "";

  const descriptionBlock =
    document.querySelector("#meetingDescriptionBlock");

  descriptionBlock.style.display =
    meeting.description && meeting.description.trim()
      ? "block"
      : "none";
}



function setupSingleChoice(selector, callback) {
  const container = document.querySelector(selector);
  const buttons = container.querySelectorAll("button");

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      buttons.forEach(btn => btn.classList.remove("selected"));
      button.classList.add("selected");
      callback(button.dataset.value);
    });
  });
}

function setupMultiChoice(selector, callback) {
  const container = document.querySelector(selector);
  const buttons = container.querySelectorAll("button");

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      button.classList.toggle("selected");

      const values = [...buttons]
        .filter(btn => btn.classList.contains("selected"))
        .map(btn => btn.dataset.value);

      callback(values);
    });
  });
}



async function loadMeeting(id) {
  const { data, error } = await db
    .from("meetings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert("Kunne ikke hente mødet: " + error.message);
    return;
  }

  meeting = {
    title: data.title,
    description: data.description,
    duration: data.duration,
    period: data.period,
    timeBlocks: data.time_blocks,
    expectedParticipants: data.expected_participants,
  };

  slots = generateSlots(meeting.period, meeting.timeBlocks);

  meetingName.textContent = meeting.title;
  adminMeetingText.textContent = meeting.description;
  meetingDuration.textContent = meeting.duration;
  meetingPeriod.textContent = meeting.period;
  meetingParticipantCount.textContent = meeting.expectedParticipants;
  meetingTimeBlocks.textContent = meeting.timeBlocks.join(", ");

  participantView.classList.remove("hidden");

  renderAvailability();

  participantView.scrollIntoView({ behavior: "smooth" });
}

async function loadAdmin(id) {
  const { data: meetingData, error: meetingError } = await db
    .from("meetings")
    .select("*")
    .eq("id", id)
    .single();

  if (meetingError) {
    alert("Kunne ikke hente arrangørsiden: " + meetingError.message);
    return;
  }

  const { data: responseData, error: responseError } = await db
    .from("responses")
    .select("*")
    .eq("meeting_id", id);

  if (responseError) {
    alert("Kunne ikke hente svar: " + responseError.message);
    return;
  }

  meeting = {
    id,
    title: meetingData.title,
    description: meetingData.description,
    duration: meetingData.duration,
    period: meetingData.period,
    timeBlocks: meetingData.time_blocks,
    expectedParticipants: meetingData.expected_participants,
  };

  slots = generateSlots(meeting.period, meeting.timeBlocks);

  responses = responseData.map(response => ({
    name: response.participant_name,
    slots: response.dates,
  }));

  renderAdmin();
}

function generateSlots(period, timeBlocks) {
  const days = getDaysFromPeriod(period);
  const slotList = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    timeBlocks.forEach(timeBlock => {
      slotList.push({
        id: `${date.toISOString().split("T")[0]}_${timeBlock}`,
        date: date.toISOString().split("T")[0],
        timeBlock,
      });
    });
  }

  return slotList;
}

function getDaysFromPeriod(period) {
  if (period === "2 uger") return 14;
  if (period === "4 uger") return 28;
  if (period === "6 uger") return 42;
  if (period === "3 måneder") return 90;
  return 14;
}

function renderAvailability() {
  availabilityGrid.innerHTML = "";

  slots.forEach(slot => {
    const card = document.createElement("div");
    card.className = "slot-card";

    if (selectedSlots.includes(slot.id)) {
      card.classList.add("selected");
    }

    card.innerHTML = `
      <span class="slot-date">${formatDate(slot.date)}</span>
      <span class="slot-time">${slot.timeBlock}</span>
    `;

    card.addEventListener("click", () => {
      toggleSlot(slot.id);
      renderAvailability();
    });

    availabilityGrid.appendChild(card);
  });
}

function toggleSlot(slotId) {
  if (selectedSlots.includes(slotId)) {
    selectedSlots = selectedSlots.filter(id => id !== slotId);
  } else {
    selectedSlots.push(slotId);
  }
}

function renderAdmin() {
  adminMeetingName.textContent = meeting.title;
  adminMeetingText.textContent = meeting.description;

  adminStatus.textContent =
    `${responses.length} / ${meeting.expectedParticipants} har svaret`;

    adminProgress.style.width =
  `${(responses.length / meeting.expectedParticipants) * 100}%`;

  adminParticipantLink.value =
    `${window.location.origin}${window.location.pathname}?meeting=${meeting.id}`;

  const answeredNames = responses.map(response => response.name);

  answeredList.innerHTML =
  answeredNames.length > 0
    ? answeredNames
        .map(name => `<span class="participant-chip">✓ ${name}</span>`)
        .join("")
    : "Ingen endnu";

  const missingCount = meeting.expectedParticipants - responses.length;

  missingList.textContent =
    missingCount > 0
      ? `${missingCount} mangler at svare`
      : "Alle har svaret 🎉";

  results.innerHTML = "";

  const sortedSlots = slots
    .map(slot => {
      const count = responses.filter(response =>
        response.slots.includes(slot.id)
      ).length;

      const cannot = responses
        .filter(response => !response.slots.includes(slot.id))
        .map(response => response.name);

      return { ...slot, count, cannot };
    })
    .sort((a, b) => b.count - a.count);

  sortedSlots.slice(0, 3).forEach((slot, index) => {
    const row = document.createElement("div");
    row.className = index === 0 ? "result-row top-result" : "result-row";

    const cannotText =
      slot.cannot.length > 0
        ? `${slot.cannot.join(", ")} kan ikke`
        : "Alle der har svaret kan";

    row.innerHTML = `
      ${index + 1}. ${formatDate(slot.date)} · ${slot.timeBlock}<br>
      ${slot.count}/${meeting.expectedParticipants} kan<br>
      ${cannotText}
    `;

    results.appendChild(row);
  });
}

function renderResults() {
  results.innerHTML = "";

  const status = document.createElement("div");
  status.className = "result-row";
  status.textContent = `Svar modtaget: ${responses.length} af ${meeting.expectedParticipants}`;
  results.appendChild(status);

  const sortedSlots = slots
    .map(slot => {
      const count = responses.filter(response =>
        response.slots.includes(slot.id)
      ).length;

      return { ...slot, count };
    })
    .sort((a, b) => b.count - a.count);

  sortedSlots.slice(0, 10).forEach((slot, index) => {
    const row = document.createElement("div");
    row.className = "result-row";

    row.innerHTML = `
      ${index + 1}. ${formatDate(slot.date)} · ${slot.timeBlock}<br>
      ${slot.count}/${meeting.expectedParticipants} kan
    `;

    results.appendChild(row);
  });
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("da-DK", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}