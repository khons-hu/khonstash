import { t, locale, number, dateTime, time, errorText, initLanguage, refreshText } from './i18n.js';
initLanguage();
import {
  GAMES,
  cents,
  buyerCost,
  netEstimate,
  marketURL,
  validateItem,
  validateBackup,
} from "./core.js";
const $ = (s) => document.querySelector(s),
  money = (n) =>
    n === null
      ? "—"
      : new Intl.NumberFormat(locale, {
          style: "currency",
          currency: "EUR",
        }).format(n / 100);
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const storageKey = "steam-shelf-v1";
let items = [],
  editing = null,
  busy = false,
  lastRequest = 0;
const date = (s) => dateTime(s);
let noticeRenderer=null;
function notice(value) {
  noticeRenderer=typeof value==='function'?value:()=>refreshText(value);
  $("#notice").textContent = noticeRenderer();
}
try {
  const raw = localStorage.getItem(storageKey);
  if (raw) items = validateBackup(JSON.parse(raw));
} catch {
  notice(
    ()=>t("Saved data could not be read. Export your current browser data before clearing storage."),
  );
}
function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ version: 1, items }));
    return true;
  } catch {
    notice(
      ()=>t("Browser storage is unavailable or full. Download a backup before closing this page."),
    );
    return false;
  }
}
function last(item) {
  return item.history.at(-1);
}
function render() {
  let cost = 0,
    net = 0,
    matchedCost = 0,
    priced = 0,
    matched = 0;
  for (const item of items) {
    if (item.cost !== null) cost += item.cost * item.quantity;
    const q = last(item);
    if (q) {
      priced++;
      net += netEstimate(q.price) * item.quantity;
      if (item.cost !== null) {
        matched++;
        matchedCost += (netEstimate(q.price) - item.cost) * item.quantity;
      }
    }
  }
  $("#cost-total").textContent = money(cost);
  $("#net-total").textContent = priced ? money(net) : "—";
  $("#difference").textContent = matched ? money(matchedCost) : "—";
  $("#coverage").textContent = items.length
    ? t`${number(items.length)}/12 items · ${number(priced)} with saved prices · ${number(matched)} with both cost and price. Totals use saved observations, not a live valuation.`
    : t("Add items to start your list.");
  $("#add").disabled = items.length >= 12;
  $("#items").innerHTML = items.length
    ? items
        .map((item) => {
          const q = last(item);
          const target = q && item.target !== null && q.price <= item.target;
          return t`<article class="item"><div class="game">${escape(GAMES[item.appid])} · ×${number(item.quantity)}</div><h2>${escape(item.name)}</h2><div class="price">${q ? money(q.price) : t("Not checked yet")}</div><div class="meta">${q ? t`${q.source === "manual" ? t("Manually recorded") : t("Lowest listing")} · ${escape(date(q.at))}<br>Estimated net: ${money(netEstimate(q.price))} per item` : t("EUR prices · check when you need them")}</div>${target ? t('<div class="target">↓ At or below your target</div>') : ""}<div class="actions"><button data-check="${escape(item.id)}" ${busy ? "disabled" : ""}>Check price</button><button data-detail="${escape(item.id)}">Notes & history</button><a href="${marketURL(item.appid, item.name)}" target="_blank" rel="noopener noreferrer">Steam ↗</a></div></article>`;
        })
        .join("")
    : t('<div class="empty"><h2>Your shelf is empty.</h2><p>Add a skin, case or another market item you actually care about.</p><button id="starter">Try with Revolution Case</button></div>');
}
function openEditor(item = null) {
  editing = item?.id || null;
  const form = $("#item-form");
  form.reset();
  $("#form-error").textContent = "";
  $("#editor-title").textContent = item ? t("Edit item") : t("Add an item");
  if (item)
    for (const key of ["appid", "name", "quantity", "cost", "target", "notes"])
      form.elements[key].value = ["cost", "target"].includes(key)
        ? item[key] === null
          ? ""
          : (item[key] / 100).toFixed(2)
        : item[key];
  $("#edit").showModal();
}
$("#add").onclick = () => openEditor();
$("#item-form").onsubmit = (event) => {
  event.preventDefault();
  const data = new FormData(event.target);
  try {
    const item = validateItem({
      appid: data.get("appid"),
      name: data.get("name"),
      quantity: data.get("quantity"),
      cost: data.get("cost") === "" ? null : cents(data.get("cost")),
      target: data.get("target") === "" ? null : cents(data.get("target")),
      notes: data.get("notes"),
    });
    const id = `${item.appid}:${item.name}`;
    if (items.some((x) => x.id === id && x.id !== editing))
      throw Error(t("That item is already on your shelf."));
    if (!editing && items.length >= 12)
      throw Error(t("Your shelf holds up to 12 items."));
    const previous = items.find((x) => x.id === editing);
    const updated = {
      ...item,
      id,
      history: previous?.id === id ? previous.history : [],
    };
    if (editing) items = items.map((x) => (x.id === editing ? updated : x));
    else items.push(updated);
    save();
    render();
    $("#edit").close();
  } catch (error) {
    $("#form-error").textContent = errorText(error);
  }
};
let detailed=null;function detail(item) {
  detailed=item;
  const q = last(item);
  $("#detail-content").innerHTML =
    t`<div class="eyebrow">${escape(GAMES[item.appid])}</div><h2>${escape(item.name)}</h2><p>${number(item.quantity)} item(s) · recorded cost ${money(item.cost)} each · target ${money(item.target)}</p>${item.cost !== null ? t`<p>Estimated break-even buyer price: <strong>${money(buyerCost(item.cost))}</strong> each.</p>` : ""}<p class="notes">${escape(item.notes || t("No notes yet."))}</p><div class="actions"><button id="edit-current">Edit item</button><button id="remove-current">Remove from shelf</button></div><form class="manual" id="manual"><label>Record an observed EUR listing price<input id="manual-price" type="number" min="0.01" max="1000000" step="0.01" required></label><button>Record price</button></form><p id="manual-status" role="status"></p><h3>Your observations</h3><p class="sub">Up to 60 saved checks. These are listing prices, not executed sales.${q?.volume ? t` Last Steam-reported volume: ${escape(q.volume)}.` : ""}</p>${
      item.history.length
        ? t`<div class="table-wrap"><table class="history"><thead><tr><th>WHEN</th><th>PRICE</th><th>SOURCE</th></tr></thead><tbody>${[
            ...item.history,
          ]
            .reverse()
            .map(
              (s) =>
                `<tr><td>${escape(date(s.at))}</td><td>${money(s.price)}</td><td>${s.source === "manual" ? t("Manual") : t("Steam quote")}</td></tr>`,
            )
            .join("")}</tbody></table></div>`
        : t("<p>No checks recorded yet.</p>")
    }`;
  $("#edit-current").onclick = () => {
    $("#details").close();
    openEditor(item);
  };
  $("#remove-current").onclick = () => {
    if (!confirm(t`Remove ${item.name} and its saved observations?`)) return;
    items = items.filter((x) => x.id !== item.id);
    save();
    render();
    $("#details").close();
  };
  $("#manual").onsubmit = (e) => {
    e.preventDefault();
    try {
      record(item, {
        price: cents($("#manual-price").value),
        at: new Date().toISOString(),
        source: "manual",
      });
      detail(item);
    } catch (error) {
      $("#manual-status").textContent = errorText(error);
    }
  };
  if (!$("#details").open) $("#details").showModal();
}
function record(item, quote) {
  if (item.history.at(-1)?.at !== quote.at) item.history.push(quote);
  item.history = item.history.slice(-60);
  save();
  render();
  if (item.target !== null && quote.price <= item.target)
    notice(
      ()=>t`${item.name} is at or below your target: ${money(quote.price)}. Check the listing on Steam before deciding.`,
    );
}
async function check(id) {
  if (busy) return;
  if (Date.now() - lastRequest < 5000) {
    notice(()=>t("Wait a few seconds before another price check."));
    return;
  }
  const item = items.find((x) => x.id === id);
  if (!item) return;
  busy = true;
  lastRequest = Date.now();
  render();
  notice(()=>t`Checking ${item.name}…`);
  try {
    const response = await fetch(
      `/api/price?${new URLSearchParams({ appid: item.appid, name: item.name })}`,
      { signal: AbortSignal.timeout(12000) },
    );
    const quote = await response.json();
    if (!response.ok) throw Error(quote.error || t("Price unavailable."));
    if (
      !Number.isSafeInteger(quote.price) ||
      quote.currency !== "EUR" ||
      !Number.isFinite(Date.parse(quote.at))
    )
      throw Error(t("Unexpected quote format."));
    notice(
      ()=>t`Saved Steam quote for ${item.name}. Quotes may be cached for 10 minutes.`,
    );
    record(item, quote);
  } catch (error) {
    notice(
      ()=>error.name === "TimeoutError"
        ? t("The price request timed out. Your saved prices are unchanged.")
        : errorText(error),
    );
  } finally {
    busy = false;
    render();
  }
}
$("#items").onclick = (e) => {
  const checkButton = e.target.closest("[data-check]"),
    detailButton = e.target.closest("[data-detail]");
  if (checkButton) check(checkButton.dataset.check);
  if (detailButton)
    detail(items.find((x) => x.id === detailButton.dataset.detail));
  if (e.target.closest("#starter")) {
    openEditor();
    $("#item-form").elements.name.value = "Revolution Case";
  }
};
for (const button of document.querySelectorAll("[data-close]"))
  button.onclick = () => button.closest("dialog").close();
$("#calculator").onsubmit = (e) => {
  e.preventDefault();
  try {
    const gross = cents($("#gross").value),
      net = netEstimate(gross);
    $("#calculation").textContent =
      t`Estimated proceeds: ${money(net)} · fees: ${money(gross - net)}`;
  } catch (error) {
    $("#calculation").textContent = errorText(error);
  }
};
function themeLabel() {
  $("#theme").setAttribute(
    "aria-label",
    document.documentElement.classList.contains("dark") ? t("Switch to light mode") : t("Switch to dark mode"),
  );
}
$("#theme").onclick = () => {
  document.documentElement.classList.toggle("dark");
  try {
    localStorage.setItem(
      "steam-shelf-theme",
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    );
  } catch {}
  themeLabel();
};
themeLabel();
$("#backup").onclick = () => {
  $("#backup-status").textContent = "";
  $("#backup-dialog").showModal();
};
$("#export").onclick = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify({ version: 1, items }, null, 2)], {
      type: "application/json",
    }),
  );
  a.download = "steam-shelf-backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$("#import").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 500000)
      throw Error(t("Backup is too large (maximum 500 KB)."));
    const imported = validateBackup(JSON.parse(await file.text()));
    if (
      !confirm(
        t`Replace your ${number(items.length)} saved item(s) with ${number(imported.length)} from this backup?`,
      )
    )
      return;
    items = imported;
    save();
    render();
    $("#backup-status").textContent = t("Backup restored.");
  } catch (error) {
    $("#backup-status").textContent = errorText(error);
  } finally {
    e.target.value = "";
  }
};
render();

function calculateInitial() {const gross=cents($("#gross").value);const net=netEstimate(gross);$("#calculation").textContent=t`Estimated proceeds: ${money(net)} · fees: ${money(gross-net)}`;}
calculateInitial();

document.addEventListener('languagechange',()=>{
 const manualValue=$('#manual-price')?.value;
 render();themeLabel();
 try{calculateInitial()}catch(error){$('#calculation').textContent=errorText(error)}
 $('#notice').textContent=noticeRenderer?noticeRenderer():'';
 for(const id of ['form-error','backup-status']){const element=$('#'+id);element.textContent=refreshText(element.textContent)}
 $('#editor-title').textContent=editing?t('Edit item'):t('Add an item');
 if($('#details').open&&detailed){detail(detailed);if(manualValue!==undefined)$('#manual-price').value=manualValue;}
});
