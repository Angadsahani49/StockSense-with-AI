// StockSense AI - Dashboard Frontend Controller

document.addEventListener("DOMContentLoaded", () => {
    initDashboard();
});

function switchTab(tabId) {
    document.querySelectorAll(".tab-pane").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));

    const targetPane = document.getElementById(`tab-${tabId}`);
    if (targetPane) targetPane.classList.add("active");

    // Highlight button
    const activeBtn = Array.from(document.querySelectorAll(".tab-btn")).find(btn => 
        btn.getAttribute("onclick")?.includes(tabId)
    );
    if (activeBtn) activeBtn.classList.add("active");

    // Trigger Plotly relayout to ensure proper width after unhiding
    window.dispatchEvent(new Event("resize"));
}

async function initDashboard() {
    await fetchStatus();
    await Promise.all([
        fetchOverview(),
        fetchMetrics(),
        fetchForecast()
    ]);
}

async function fetchStatus() {
    try {
        const res = await fetch("/api/status");
        const json = await res.json();
        if (json.status === "success") {
            const data = json.data;
            const badge = document.getElementById("dataset-source-text");
            badge.textContent = data.is_sample_data 
                ? "Bundled Sample Dataset (Fallback)" 
                : "Public UCI/OpenML Mirror";
            badge.title = `${data.source} (${data.record_count} records)`;
            
            document.getElementById("disclaimer-content").textContent = data.disclaimer;
            document.getElementById("kpi-records").textContent = `${data.record_count.toLocaleString()} valid records`;
        }
    } catch (e) {
        console.error("Failed to load dataset status:", e);
    }
}

async function fetchOverview() {
    try {
        const res = await fetch("/api/overview");
        const json = await res.json();
        if (json.status === "success") {
            const data = json.data;
            document.getElementById("kpi-volume").textContent = data.total_units_sold.toLocaleString();
            document.getElementById("kpi-revenue").textContent = `$${data.total_revenue.toLocaleString()}`;

            // Render Top Products Table
            const tbody = document.getElementById("top-products-body");
            tbody.innerHTML = "";
            data.top_products.forEach(p => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><code>${p.product_id}</code></td>
                    <td><strong>${p.product_name}</strong></td>
                    <td>${p.category}</td>
                    <td>${p.units_sold.toLocaleString()}</td>
                    <td>$${p.total_revenue.toLocaleString()}</td>
                `;
                tbody.appendChild(tr);
            });

            // Render Day of Week Chart
            const days = data.day_of_week_patterns.map(d => d.day);
            const units = data.day_of_week_patterns.map(d => d.avg_units);

            Plotly.newPlot("dow-plot", [{
                x: days,
                y: units,
                type: "bar",
                marker: { color: "#2563eb", opacity: 0.85 }
            }], {
                margin: { t: 20, r: 20, l: 40, b: 40 },
                xaxis: { title: "Day of Week" },
                yaxis: { title: "Average Units Sold" },
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent"
            }, { responsive: true, displayModeBar: false });
        }
    } catch (e) {
        console.error("Failed to load overview:", e);
    }
}

async function fetchMetrics() {
    try {
        const res = await fetch("/api/metrics");
        const json = await res.json();
        if (json.status === "success") {
            const rf = json.metrics.random_forest;
            const base = json.metrics.baseline;
            const imp = json.metrics.improvement;

            document.getElementById("kpi-mae").textContent = rf.mae.toFixed(1);
            document.getElementById("kpi-improvement").textContent = `-${imp.mae_reduction_percent}% error vs baseline`;
            document.getElementById("kpi-r2").textContent = rf.r2_score.toFixed(3);

            // Populate Table
            const tbody = document.getElementById("metrics-table-body");
            tbody.innerHTML = `
                <tr>
                    <td><strong>Mean Absolute Error (MAE)</strong></td>
                    <td><strong>${rf.mae} units</strong></td>
                    <td>${base.mae} units</td>
                    <td style="color: #059669; font-weight: 700;">-${imp.mae_reduction_percent}%</td>
                </tr>
                <tr>
                    <td><strong>Root Mean Squared Error (RMSE)</strong></td>
                    <td><strong>${rf.rmse}</strong></td>
                    <td>${base.rmse}</td>
                    <td style="color: #059669; font-weight: 700;">-${imp.rmse_reduction_percent}%</td>
                </tr>
                <tr>
                    <td><strong>R² Score (Variance Explained)</strong></td>
                    <td><strong>${rf.r2_score}</strong></td>
                    <td>${base.r2_score}</td>
                    <td>+${(rf.r2_score - base.r2_score).toFixed(3)}</td>
                </tr>
                <tr>
                    <td><strong>Mean Absolute % Error (MAPE)</strong></td>
                    <td><strong>${rf.mape}%</strong></td>
                    <td>${base.mape}%</td>
                    <td style="color: #059669;">-${(base.mape - rf.mape).toFixed(1)}%</td>
                </tr>
            `;

            // Render Feature Importance Chart
            const feats = json.feature_importance.slice(0, 8);
            Plotly.newPlot("features-plot", [{
                x: feats.map(f => f.importance).reverse(),
                y: feats.map(f => f.feature).reverse(),
                type: "bar",
                orientation: "h",
                marker: { color: "#059669" }
            }], {
                margin: { t: 20, r: 20, l: 120, b: 40 },
                xaxis: { title: "Relative Importance (%)" },
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent"
            }, { responsive: true, displayModeBar: false });
        }
    } catch (e) {
        console.error("Failed to load metrics:", e);
    }
}

async function fetchForecast() {
    try {
        const res = await fetch("/api/forecast");
        const json = await res.json();
        if (json.status === "success") {
            const fc = json.forecast;
            const container = document.getElementById("forecast-cards");
            container.innerHTML = "";

            document.getElementById("forecast-date-range").textContent = 
                `${fc[0].date} to ${fc[fc.length - 1].date}`;

            fc.forEach(item => {
                const card = document.createElement("div");
                card.className = `fc-card ${item.is_weekend ? "weekend" : ""}`;
                card.innerHTML = `
                    <div class="fc-day">${item.day_name}</div>
                    <div class="fc-date">${item.date}</div>
                    <div class="fc-units">${item.predicted_units} <span style="font-size:12px; font-weight:normal; color:#64748b;">units</span></div>
                    <div class="fc-bounds">95% CI: [${item.lower_bound} - ${item.upper_bound}]</div>
                    <div class="fc-revenue">Est. $${item.estimated_revenue.toLocaleString()}</div>
                `;
                container.appendChild(card);
            });

            // Plot 7-day forecast
            Plotly.newPlot("forecast-plot", [
                {
                    x: fc.map(f => f.date),
                    y: fc.map(f => f.predicted_units),
                    type: "scatter",
                    mode: "lines+markers",
                    name: "Predicted Demand",
                    line: { color: "#2563eb", width: 3 },
                    marker: { size: 8 }
                },
                {
                    x: fc.map(f => f.date),
                    y: fc.map(f => f.upper_bound),
                    type: "scatter",
                    mode: "lines",
                    name: "Upper 95% Bound",
                    line: { width: 0 },
                    showlegend: false
                },
                {
                    x: fc.map(f => f.date),
                    y: fc.map(f => f.lower_bound),
                    type: "scatter",
                    mode: "lines",
                    name: "95% Confidence Interval",
                    fill: "tonexty",
                    fillcolor: "rgba(37, 99, 235, 0.12)",
                    line: { width: 0 }
                }
            ], {
                margin: { t: 30, r: 30, l: 50, b: 50 },
                xaxis: { title: "Date" },
                yaxis: { title: "Forecasted Quantity" },
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent"
            }, { responsive: true, displayModeBar: false });

            // Validation Plot (Actual vs Predicted)
            const avp = json.actual_vs_predicted;
            Plotly.newPlot("validation-plot", [
                {
                    x: avp.map(d => d.date),
                    y: avp.map(d => d.actual),
                    type: "scatter",
                    mode: "lines",
                    name: "Actual Sales",
                    line: { color: "#0f172a", width: 2 }
                },
                {
                    x: avp.map(d => d.date),
                    y: avp.map(d => d.rf_predicted),
                    type: "scatter",
                    mode: "lines",
                    name: "Random Forest Prediction",
                    line: { color: "#059669", width: 2.2, dash: "dot" }
                },
                {
                    x: avp.map(d => d.date),
                    y: avp.map(d => d.baseline_predicted),
                    type: "scatter",
                    mode: "lines",
                    name: "Naive Baseline (t-1)",
                    line: { color: "#94a3b8", width: 1.2 }
                }
            ], {
                margin: { t: 30, r: 30, l: 50, b: 50 },
                xaxis: { title: "Date (Chronological Test Period)" },
                yaxis: { title: "Sales Quantity" },
                legend: { orientation: "h", y: 1.12 },
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent"
            }, { responsive: true, displayModeBar: false });
        }
    } catch (e) {
        console.error("Failed to load forecast:", e);
    }
}

async function retrainModel() {
    const btn = document.getElementById("btn-retrain");
    btn.disabled = true;
    btn.innerHTML = `<span>Training ML Model...</span>`;
    try {
        const res = await fetch("/api/retrain", { method: "POST" });
        const json = await res.json();
        if (json.status === "success") {
            await initDashboard();
        }
    } catch (e) {
        alert("Retraining failed: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
            <span>Retrain Model</span>
        `;
    }
}
