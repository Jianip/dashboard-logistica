"use client";

import {
  AlertTriangle,
  ArrowDownUp,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  MapPin,
  PackageCheck,
  Search,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Delivery = {
  id_entrega: number;
  transportadora: string;
  regiao: string;
  prazo_dias: number;
  dias_reais: number;
};

type Priority = "Normal" | "Media" | "Alta" | "Critica";
type Status = "No Prazo" | "Atrasada";
type SortKey =
  | "id_entrega"
  | "transportadora"
  | "regiao"
  | "prazo_dias"
  | "dias_reais"
  | "dias_atraso"
  | "prioridade";

const deliveries: Delivery[] = [
  { id_entrega: 301, transportadora: "RotaMax", regiao: "Sudeste", prazo_dias: 3, dias_reais: 7 },
  { id_entrega: 302, transportadora: "ViaCargo", regiao: "Sul", prazo_dias: 5, dias_reais: 5 },
  { id_entrega: 303, transportadora: "FlashLog", regiao: "Nordeste", prazo_dias: 4, dias_reais: 9 },
  { id_entrega: 304, transportadora: "RotaMax", regiao: "Norte", prazo_dias: 6, dias_reais: 4 },
  { id_entrega: 305, transportadora: "ViaCargo", regiao: "Centro-Oeste", prazo_dias: 2, dias_reais: 6 },
  { id_entrega: 306, transportadora: "FlashLog", regiao: "Sul", prazo_dias: 5, dias_reais: 12 },
  { id_entrega: 307, transportadora: "RotaMax", regiao: "Sul", prazo_dias: 6, dias_reais: 9 },
  { id_entrega: 308, transportadora: "ViaCargo", regiao: "Sudeste", prazo_dias: 3, dias_reais: 4 },
  { id_entrega: 309, transportadora: "FlashLog", regiao: "Norte", prazo_dias: 5, dias_reais: 5 },
  { id_entrega: 310, transportadora: "ViaCargo", regiao: "Nordeste", prazo_dias: 4, dias_reais: 8 },
];

const priorityRank: Record<Priority, number> = {
  Normal: 0,
  Media: 1,
  Alta: 2,
  Critica: 3,
};

const priorityStyles: Record<Priority, string> = {
  Normal: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Media: "border-yellow-200 bg-yellow-50 text-yellow-700",
  Alta: "border-orange-200 bg-orange-50 text-orange-700",
  Critica: "border-red-200 bg-red-50 text-red-700",
};

const priorityDot: Record<Priority, string> = {
  Normal: "bg-emerald-500",
  Media: "bg-yellow-500",
  Alta: "bg-orange-500",
  Critica: "bg-red-500",
};

const chartColors = ["#ef4444", "#f97316", "#14b8a6", "#2563eb", "#7c3aed"];

function getDelay(delivery: Delivery) {
  return Math.max(0, delivery.dias_reais - delivery.prazo_dias);
}

function getPriority(delay: number): Priority {
  if (delay === 0) return "Normal";
  if (delay <= 2) return "Media";
  if (delay <= 4) return "Alta";
  return "Critica";
}

function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function aggregateBy<T extends string>(
  rows: EnrichedDelivery[],
  key: (row: EnrichedDelivery) => T,
) {
  const map = new Map<T, { name: T; atraso: number; entregas: number; atrasadas: number }>();
  rows.forEach((row) => {
    const name = key(row);
    const current = map.get(name) ?? { name, atraso: 0, entregas: 0, atrasadas: 0 };
    current.atraso += row.dias_atraso;
    current.entregas += 1;
    current.atrasadas += row.status === "Atrasada" ? 1 : 0;
    map.set(name, current);
  });
  return [...map.values()].sort((a, b) => b.atraso - a.atraso);
}

type EnrichedDelivery = Delivery & {
  dias_atraso: number;
  prioridade: Priority;
  status: Status;
};

function Badge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityStyles[priority]}`}>
      <span className={`h-2 w-2 rounded-full ${priorityDot[priority]}`} />
      {priority}
    </span>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-800 shadow-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
      >
        <option value="Todos">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function Home() {
  const [region, setRegion] = useState("Todos");
  const [carrier, setCarrier] = useState("Todos");
  const [priority, setPriority] = useState("Todos");
  const [status, setStatus] = useState("Todos");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("dias_atraso");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const enriched = useMemo<EnrichedDelivery[]>(
    () =>
      deliveries.map((delivery) => {
        const delay = getDelay(delivery);
        return {
          ...delivery,
          dias_atraso: delay,
          prioridade: getPriority(delay),
          status: delay > 0 ? "Atrasada" : "No Prazo",
        };
      }),
    [],
  );

  const regions = useMemo(() => [...new Set(enriched.map((item) => item.regiao))].sort(), [enriched]);
  const carriers = useMemo(() => [...new Set(enriched.map((item) => item.transportadora))].sort(), [enriched]);
  const priorities = ["Normal", "Media", "Alta", "Critica"];

  const filtered = useMemo(
    () =>
      enriched.filter((item) => {
        const matchesRegion = region === "Todos" || item.regiao === region;
        const matchesCarrier = carrier === "Todos" || item.transportadora === carrier;
        const matchesPriority = priority === "Todos" || item.prioridade === priority;
        const matchesStatus = status === "Todos" || item.status === status;
        return matchesRegion && matchesCarrier && matchesPriority && matchesStatus;
      }),
    [carrier, enriched, priority, region, status],
  );

  const metrics = useMemo(() => {
    const delayed = filtered.filter((item) => item.status === "Atrasada");
    const totalDelay = filtered.reduce((sum, item) => sum + item.dias_atraso, 0);
    const carrierRanking = aggregateBy(filtered, (item) => item.transportadora);
    const regionRanking = aggregateBy(filtered, (item) => item.regiao);
    return {
      total: filtered.length,
      delayed: delayed.length,
      onTime: filtered.length - delayed.length,
      percentDelayed: filtered.length ? (delayed.length / filtered.length) * 100 : 0,
      averageDelay: delayed.length ? totalDelay / delayed.length : 0,
      totalDelay,
      carrierRanking,
      regionRanking,
      worstCarrier: carrierRanking[0]?.name ?? "-",
      criticalRegion: regionRanking[0]?.name ?? "-",
      mostCritical: [...filtered].sort((a, b) => b.dias_atraso - a.dias_atraso)[0],
    };
  }, [filtered]);

  const tableRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const searched = filtered.filter((item) =>
      [
        item.id_entrega,
        item.transportadora,
        item.regiao,
        item.prazo_dias,
        item.dias_reais,
        item.dias_atraso,
        item.prioridade,
        item.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );

    return searched.sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortKey === "prioridade") {
        return (priorityRank[aValue as Priority] - priorityRank[bValue as Priority]) * direction;
      }
      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * direction;
      }
      return String(aValue).localeCompare(String(bValue), "pt-BR") * direction;
    });
  }, [filtered, search, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(tableRows.length / pageSize));
  const activePage = Math.min(page, totalPages);
  const paginatedRows = tableRows.slice((activePage - 1) * pageSize, activePage * pageSize);

  const statusData = [
    { name: "No Prazo", value: metrics.onTime, fill: "#10b981" },
    { name: "Atrasada", value: metrics.delayed, fill: "#ef4444" },
  ];

  const alerts = [
    `${metrics.worstCarrier} apresenta o maior volume de atrasos.`,
    `${metrics.criticalRegion === "-" ? "Nenhuma regiao" : `Regiao ${metrics.criticalRegion}`} concentra a maior quantidade de dias de atraso.`,
    metrics.mostCritical
      ? `Entrega ${metrics.mostCritical.id_entrega} e a mais critica da operacao.`
      : "Nenhuma entrega corresponde aos filtros atuais.",
    `${formatPercent(metrics.percentDelayed)} das entregas encontram-se atrasadas.`,
  ];

  const insights = [
    `O desempenho da transportadora ${metrics.worstCarrier} exige atencao devido ao maior volume de atrasos acumulados no recorte atual.`,
    `A regiao ${metrics.criticalRegion} apresenta o maior impacto operacional e deve ser priorizada nas tratativas com bases e parceiros.`,
    metrics.averageDelay >= 4
      ? "A media de atraso esta elevada, indicando necessidade de acao executiva imediata."
      : "A media de atraso esta controlada, mas os casos criticos ainda precisam de acompanhamento individual.",
  ];

  const kpis = [
    { label: "Total de entregas", value: metrics.total, icon: PackageCheck, tone: "text-teal-600 bg-teal-50" },
    { label: "Entregas atrasadas", value: metrics.delayed, icon: AlertTriangle, tone: "text-red-600 bg-red-50" },
    { label: "Percentual de atraso", value: formatPercent(metrics.percentDelayed), icon: BarChart3, tone: "text-orange-600 bg-orange-50" },
    {
      label: "Media de dias de atraso",
      value: metrics.averageDelay.toLocaleString("pt-BR", { maximumFractionDigits: 1 }),
      icon: Clock3,
      tone: "text-blue-600 bg-blue-50",
    },
    { label: "Transportadora critica", value: metrics.worstCarrier, icon: Truck, tone: "text-violet-600 bg-violet-50" },
    { label: "Regiao mais critica", value: metrics.criticalRegion, icon: MapPin, tone: "text-rose-600 bg-rose-50" },
  ];

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("desc");
  }

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="max-w-4xl">
              <h1 className="text-2xl font-bold leading-tight text-slate-950 sm:text-4xl">
                Dashboard Inteligente de Monitoramento Logistico
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                Analise de atrasos, transportadoras, regioes criticas e prioridades operacionais.
              </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SelectFilter label="Regiao" value={region} options={regions} onChange={(value) => updateFilter(setRegion, value)} />
            <SelectFilter label="Transportadora" value={carrier} options={carriers} onChange={(value) => updateFilter(setCarrier, value)} />
            <SelectFilter label="Prioridade" value={priority} options={priorities} onChange={(value) => updateFilter(setPriority, value)} />
            <SelectFilter label="Status" value={status} options={["No Prazo", "Atrasada"]} onChange={(value) => updateFilter(setStatus, value)} />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <article key={kpi.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg sm:h-11 sm:w-11 ${kpi.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
                <p className="mt-2 break-words text-xl font-bold text-slate-950 sm:text-2xl" title={String(kpi.value)}>
                  {kpi.value}
                </p>
              </article>
            );
          })}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Comparacao entre transportadoras</h2>
                <p className="text-sm text-slate-500">Soma de dias de atraso com ranking automatico.</p>
              </div>
              <Truck className="h-6 w-6 text-teal-600" />
            </div>
            <div className="h-72 min-w-0 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.carrierRanking} layout="vertical" margin={{ left: 16, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" width={90} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "#f1f5f9" }} />
                  <Bar dataKey="atraso" name="Dias de atraso" radius={[0, 8, 8, 0]}>
                    {metrics.carrierRanking.map((entry, index) => (
                      <Cell key={entry.name} fill={index === 0 ? "#ef4444" : chartColors[index % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Status operacional</h2>
                <p className="text-sm text-slate-500">Entregas no prazo versus atrasadas.</p>
              </div>
              <PackageCheck className="h-6 w-6 text-teal-600" />
            </div>
            <div className="h-72 min-w-0 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={78} outerRadius={112} paddingAngle={4}>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Analise regional</h2>
                <p className="text-sm text-slate-500">Regioes ordenadas da maior para a menor criticidade.</p>
              </div>
              <MapPin className="h-6 w-6 text-teal-600" />
            </div>
            <div className="h-72 min-w-0 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.regionRanking} margin={{ top: 10, right: 16, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-12} textAnchor="end" height={54} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "#f1f5f9" }} />
                  <Bar dataKey="atraso" name="Dias de atraso" radius={[8, 8, 0, 0]}>
                    {metrics.regionRanking.map((entry, index) => (
                      <Cell key={entry.name} fill={index === 0 ? "#ef4444" : chartColors[index % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Ranking de entregas criticas</h2>
                <p className="text-sm text-slate-500">Prioridade operacional por dias de atraso.</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div className="space-y-3">
              {[...filtered]
                .filter((item) => item.dias_atraso > 0)
                .sort((a, b) => b.dias_atraso - a.dias_atraso)
                .slice(0, 5)
                .map((item, index) => (
                  <div key={item.id_entrega} className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-slate-700 shadow-sm">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-bold">Entrega {item.id_entrega}</p>
                        <p className="text-sm text-slate-500">{item.transportadora} · {item.regiao}</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-bold text-red-600">{item.dias_atraso} dias</p>
                      <Badge priority={item.prioridade} />
                    </div>
                  </div>
                ))}
            </div>
          </article>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Alertas inteligentes
            </h2>
            <div className="grid gap-3">
              {alerts.map((alert) => (
                <p key={alert} className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800">
                  {alert}
                </p>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <BarChart3 className="h-5 w-5 text-teal-600" />
              Insights executivos
            </h2>
            <div className="grid gap-3">
              {insights.map((insight) => (
                <p key={insight} className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900">
                  {insight}
                </p>
              ))}
            </div>
          </article>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-bold">Tabela interativa completa</h2>
              <p className="text-sm text-slate-500">Pesquisa, ordenacao, paginacao e destaque de atrasos criticos.</p>
            </div>
            <div className="flex h-11 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm lg:w-80">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Pesquisar entregas"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  {[
                    ["id_entrega", "ID Entrega"],
                    ["transportadora", "Transportadora"],
                    ["regiao", "Regiao"],
                    ["prazo_dias", "Prazo"],
                    ["dias_reais", "Dias Reais"],
                    ["dias_atraso", "Dias de Atraso"],
                    ["prioridade", "Prioridade"],
                  ].map(([key, label]) => (
                    <th key={key} className="px-3 py-2">
                      <button className="inline-flex items-center gap-1 font-bold" onClick={() => toggleSort(key as SortKey)} title={`Ordenar por ${label}`}>
                        {label}
                        <ArrowDownUp className="h-3.5 w-3.5" />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((item) => (
                  <tr key={item.id_entrega} className={item.prioridade === "Critica" ? "bg-red-50" : "bg-slate-50"}>
                    <td className="rounded-l-lg px-3 py-3 font-bold">{item.id_entrega}</td>
                    <td className="px-3 py-3">{item.transportadora}</td>
                    <td className="px-3 py-3">{item.regiao}</td>
                    <td className="px-3 py-3">{item.prazo_dias} dias</td>
                    <td className="px-3 py-3">{item.dias_reais} dias</td>
                    <td className="px-3 py-3 font-bold text-slate-950">{item.dias_atraso}</td>
                    <td className="rounded-r-lg px-3 py-3">
                      <Badge priority={item.prioridade} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col justify-between gap-3 text-sm text-slate-600 sm:flex-row sm:items-center">
            <span>
              Mostrando {paginatedRows.length} de {tableRows.length} registros filtrados
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={activePage === 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:cursor-not-allowed disabled:opacity-40"
                title="Pagina anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-semibold text-slate-800">
                {activePage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={activePage === totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:cursor-not-allowed disabled:opacity-40"
                title="Proxima pagina"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold">Painel executivo resumido</h2>
            <p className="mt-1 text-sm text-slate-300">
              {metrics.delayed} entregas atrasadas, {metrics.totalDelay} dias acumulados de atraso e foco principal em {metrics.worstCarrier}.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-3 text-sm font-bold">
            <Filter className="h-4 w-4 text-teal-300" />
            Visao filtrada em tempo real
          </div>
        </section>
      </div>
    </main>
  );
}
