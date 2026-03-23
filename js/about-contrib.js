(function () {
  const DATA_URL = "/data/github-contributions.json";
  const SECTION_ID = "about-contrib";
  const palette = [
    { top: "#172433", side: "#111b28", front: "#0e1723" },
    { top: "#0f5d3f", side: "#0c452f", front: "#0b3826" },
    { top: "#177f52", side: "#116141", front: "#0e4b33" },
    { top: "#23a466", side: "#1a804f", front: "#16633f" },
    { top: "#7ce38b", side: "#52b96b", front: "#369355" }
  ];

  const numberFormatter = new Intl.NumberFormat("en-US");
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
  const syncFormatter = new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  const pluralize = (value, unit) => `${value} ${unit}${value === 1 ? "" : "s"}`;

  const renderStats = (statsContainer, summary) => {
    const items = [
      {
        label: "Last Year",
        value: numberFormatter.format(summary.totalContributions),
        helper: "官方总贡献数"
      },
      {
        label: "Active Days",
        value: numberFormatter.format(summary.activeDays),
        helper: "有提交记录的天数"
      },
      {
        label: "Current Streak",
        value: pluralize(summary.currentStreak, "day"),
        helper: "连续活跃中"
      },
      {
        label: "Longest Streak",
        value: pluralize(summary.longestStreak, "day"),
        helper: "最长连续活跃"
      },
      {
        label: "Peak Day",
        value: numberFormatter.format(summary.maxDaily),
        helper: "单日最高贡献"
      }
    ];

    statsContainer.innerHTML = items
      .map(
        (item) => `
          <article class="about-contrib__stat">
            <span>${item.label}</span>
            <strong>${item.value}</strong>
            <em>${item.helper}</em>
          </article>
        `
      )
      .join("");
  };

  const renderMonths = (monthsContainer, months, weeks) => {
    monthsContainer.style.setProperty("--contrib-weeks", weeks);
    monthsContainer.innerHTML = months
      .map(
        (month) => `
          <span class="about-contrib__month" style="grid-column:${month.weekIndex + 1}">
            ${month.label}
          </span>
        `
      )
      .join("");
  };

  const renderHeatmap = (heatmapContainer, days, weeks) => {
    heatmapContainer.style.setProperty("--contrib-weeks", weeks);
    heatmapContainer.innerHTML = days
      .map((day) => {
        const tone = palette[Math.max(0, Math.min(day.level, palette.length - 1))];
        const depth = `${2 + day.level * 2}px`;
        const countLabel =
          day.count === 0
            ? "No contributions"
            : `${numberFormatter.format(day.count)} contribution${day.count > 1 ? "s" : ""}`;
        const dateLabel = dateFormatter.format(new Date(`${day.date}T00:00:00Z`));

        return `
          <button
            type="button"
            class="about-contrib__cell"
            style="
              grid-column:${day.weekIndex + 1};
              grid-row:${day.dayOfWeek + 1};
              --cell-depth:${depth};
              --cell-top:${tone.top};
              --cell-side:${tone.side};
              --cell-front:${tone.front};
            "
            aria-label="${countLabel} on ${dateLabel}"
            title="${countLabel} on ${dateLabel}"
          >
            <span class="about-contrib__cell-core"></span>
          </button>
        `;
      })
      .join("");
  };

  const renderLegend = (legendContainer) => {
    legendContainer.innerHTML = `
      <span class="about-contrib__legend-text">Less</span>
      <span class="about-contrib__legend-cell level-0"></span>
      <span class="about-contrib__legend-cell level-1"></span>
      <span class="about-contrib__legend-cell level-2"></span>
      <span class="about-contrib__legend-cell level-3"></span>
      <span class="about-contrib__legend-cell level-4"></span>
      <span class="about-contrib__legend-text">More</span>
    `;
  };

  const renderEmptyState = (section, message) => {
    const summary = section.querySelector('[data-role="summary"]');
    const stats = section.querySelector('[data-role="stats"]');
    const months = section.querySelector('[data-role="months"]');
    const heatmap = section.querySelector('[data-role="heatmap"]');
    const caption = section.querySelector('[data-role="caption"]');

    if (summary) summary.textContent = message;
    if (stats) {
      stats.innerHTML = `
        <article class="about-contrib__stat is-empty">
          <span>Sync Status</span>
          <strong>Unavailable</strong>
          <em>稍后将自动重试同步</em>
        </article>
      `;
    }
    if (months) months.innerHTML = "";
    if (heatmap) heatmap.innerHTML = "";
    if (caption) caption.textContent = "GitHub 官方 contributions 数据暂时不可用。";
  };

  const fetchData = async () => {
    const version = new Date().toISOString().slice(0, 10);
    const response = await fetch(`${DATA_URL}?v=${version}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Failed to load contributions data: ${response.status}`);
    }

    return response.json();
  };

  const mountSection = async (section) => {
    if (!section || section.dataset.loading === "1") return;

    const title = section.querySelector('[data-role="title"]');
    const summary = section.querySelector('[data-role="summary"]');
    const link = section.querySelector('[data-role="link"]');
    const stats = section.querySelector('[data-role="stats"]');
    const months = section.querySelector('[data-role="months"]');
    const heatmap = section.querySelector('[data-role="heatmap"]');
    const legend = section.querySelector('[data-role="legend"]');
    const caption = section.querySelector('[data-role="caption"]');

    section.dataset.loading = "1";

    try {
      const data = await fetchData();
      if (!Array.isArray(data.days) || data.days.length === 0) {
        renderEmptyState(section, "GitHub contributions 正在等待首次同步，稍后刷新页面查看。");
        return;
      }

      if (title) title.textContent = "GitHub Profile 3D Contrib";
      if (summary) {
        summary.innerHTML = `
          过去一年累计 <strong>${numberFormatter.format(data.summary.totalContributions)}</strong> 次贡献，
          当前连续 <strong>${data.summary.currentStreak}</strong> 天活跃，
          最近同步于 ${syncFormatter.format(new Date(data.generatedAt))}。
        `;
      }
      if (link) {
        link.href = data.profileUrl;
        link.textContent = `@${data.username}`;
      }
      if (stats) renderStats(stats, data.summary);
      if (months) renderMonths(months, data.months, data.weeks);
      if (heatmap) renderHeatmap(heatmap, data.days, data.weeks);
      if (legend) renderLegend(legend);
      if (caption) {
        caption.textContent = `GitHub 官方 contributions 图谱，按日同步，时间范围 ${data.range.from} 至 ${data.range.to}。`;
      }
    } catch (error) {
      renderEmptyState(section, "GitHub contributions 数据加载失败，稍后刷新页面再试。");
      console.error("[about-contrib]", error);
    } finally {
      section.dataset.loading = "0";
    }
  };

  const boot = () => {
    const section = document.getElementById(SECTION_ID);
    if (!section) return;
    mountSection(section);
  };

  document.addEventListener("DOMContentLoaded", boot);
  document.addEventListener("pjax:complete", boot);

  if (document.readyState !== "loading") {
    boot();
  }
})();
