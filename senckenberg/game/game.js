// The questions are written by hand. The view counts come from Wikimedia.
const ui = Object.fromEntries(
  [...document.querySelectorAll("[id]")].map((element) => [element.id, element])
);
const number = new Intl.NumberFormat("en");
const month = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
  timeZone: "UTC"
});

let rounds = [];
let roundIndex = 0;
let plays = [];

// Accept differences in case, accents, hyphens and punctuation.
function normalise(text) {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

async function readJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status}).`);
  return response.json();
}

function prepareRound(round, articles) {
  const answers = round.answers.map((answer) => {
    const article = articles[answer.article];
    if (!article || !Number.isSafeInteger(article.views) || article.views < 0) {
      throw new Error(`Missing Wikimedia views for "${answer.article}".`);
    }
    const names = [answer.article, article.title, ...answer.aliases].map(normalise);
    return { ...article, label: answer.article, names };
  });

  answers.sort((first, second) => first.views - second.views);
  const viewRanks = [...new Set(answers.map((answer) => answer.views))];

  // Scale the ranks from 100 to 20. Equal view counts earn equal points.
  for (const answer of answers) {
    const rank = viewRanks.indexOf(answer.views);
    answer.points = Math.round(100 - 80 * rank / Math.max(1, viewRanks.length - 1));
  }
  return { ...round, answers };
}

async function loadGame() {
  try {
    const [questions, snapshot] = await Promise.all([
      readJson("data/questions.json"),
      readJson("data/pageviews.json")
    ]);
    if (!questions.length) throw new Error("Add at least one round.");
    rounds = questions.map((round) => prepareRound(round, snapshot.articles));
    ui["data-period"].textContent =
      `English Wikipedia · ${month.formatRange(new Date(snapshot.start), new Date(snapshot.end))}`;
    ui.loading.hidden = true;
    showRound();
  } catch (error) {
    console.error(error);
    ui.loading.textContent = window.location.protocol === "file:"
      ? "Open the site through a local web server. The README shows how."
      : "The game data could not be loaded. Refresh the page to try again.";
  }
}

function totalScore() {
  return plays.reduce((total, answer) => total + (answer?.points ?? 0), 0);
}

function showRound(moveFocus = false) {
  const round = rounds[roundIndex];
  ui.results.hidden = true;
  ui.round.hidden = false;
  ui["round-number"].textContent = `Round ${roundIndex + 1} of ${rounds.length}`;
  ui["running-score"].textContent = number.format(totalScore());
  ui["round-progress"].max = rounds.length;
  ui["round-progress"].value = roundIndex + 1;
  ui.topic.textContent = round.topic;
  ui.question.textContent = round.question;
  ui["hint-text"].textContent = round.hint;
  ui.hint.open = false;
  ui["answer-form"].reset();
  clearAnswerMessage();
  ui["answer-form"].hidden = false;
  ui.feedback.hidden = true;
  if (moveFocus) ui.question.focus();
}

function clearAnswerMessage() {
  ui["answer-message"].textContent = "";
  ui.answer.removeAttribute("aria-invalid");
}

function articleLink(answer) {
  const link = document.createElement("a");
  link.href = answer.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = answer.label;
  return link;
}

function finishRound(answer) {
  plays.push(answer);
  ui["running-score"].textContent = number.format(totalScore());
  ui["answer-form"].hidden = true;
  ui["feedback-points"].textContent = answer ? `+${answer.points} points` : "Round skipped";
  ui["feedback-detail"].textContent = "The accepted answers are revealed at the end.";
  if (answer) {
    const views = ` received ${number.format(answer.views)} views in the scoring period.`;
    ui["feedback-detail"].replaceChildren(articleLink(answer), views);
  }
  ui.next.firstChild.textContent = roundIndex + 1 === rounds.length ? "See results " : "Next round ";
  ui.feedback.hidden = false;
  ui["feedback-points"].focus();
}

function showResults() {
  ui.round.hidden = true;
  ui["final-score"].textContent = `You scored ${totalScore()} / ${rounds.length * 100}`;
  ui["answer-reveal"].replaceChildren();

  rounds.forEach((round, index) => {
    const review = ui["round-review"].content.cloneNode(true);
    const played = plays[index];
    review.querySelector(".review-topic").textContent = round.topic;
    review.querySelector(".review-score").textContent = `${played?.points ?? 0} pts`;
    review.querySelector(".review-answer").textContent = played
      ? `Your answer: ${played.label}`
      : "You skipped this round.";

    const table = review.querySelector("tbody");
    for (const answer of round.answers) {
      const row = table.insertRow();
      row.insertCell().append(articleLink(answer));
      row.insertCell().textContent = number.format(answer.views);
      row.insertCell().textContent = answer.points;
    }
    ui["answer-reveal"].append(review);
  });

  ui.results.hidden = false;
  ui["final-score"].focus();
}

ui["answer-form"].addEventListener("submit", (event) => {
  event.preventDefault();
  const guess = normalise(ui.answer.value);
  const answer = rounds[roundIndex].answers.find((item) => item.names.includes(guess));

  if (answer) {
    finishRound(answer);
  } else {
    ui["answer-message"].textContent = guess
      ? "That answer isn’t on this round’s list. Try another name, use the hint or skip."
      : "Enter an answer to continue.";
    ui.answer.setAttribute("aria-invalid", "true");
    ui.answer.focus();
  }
});

ui.answer.addEventListener("input", clearAnswerMessage);
ui.skip.addEventListener("click", () => finishRound(null));
ui.next.addEventListener("click", () => {
  roundIndex += 1;
  if (roundIndex === rounds.length) showResults();
  else showRound(true);
});
ui.restart.addEventListener("click", () => {
  plays = [];
  roundIndex = 0;
  showRound(true);
});

loadGame();
