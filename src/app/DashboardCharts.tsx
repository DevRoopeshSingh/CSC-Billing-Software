"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { formatCurrency } from "@/lib/formatters";

const COLORS = ["#10B981", "#0F766E", "#F59E0B", "#3B82F6", "#8B5CF6"];

export default function DashboardCharts({
  revenueData,
  paymentData,
}: {
  revenueData: any[];
  paymentData: any[];
}) {
  return (
    <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 28 }}>
      <div className="card" style={{ display: "flex", flexDirection: "column" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Revenue (Last 7 Days)</h3>
        <div style={{ position: "relative", height: 260, minHeight: 0, width: "100%", flex: 1 }}>
          <div style={{ position: "absolute", inset: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} tickFormatter={(val) => `₹${val}`} />
                <Tooltip 
                  cursor={{ fill: "var(--bg)" }} 
                  contentStyle={{ borderRadius: "var(--radius-md)", border: "none", boxShadow: "var(--shadow-md)" }}
                  formatter={(val: any) => [formatCurrency(val), "Revenue"]}
                />
                <Bar dataKey="total" fill="#0F766E" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Payment Modes (Today)</h3>
        {paymentData.length === 0 ? (
          <div style={{ height: 260, flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p className="text-muted">No payments today</p>
          </div>
        ) : (
          <div style={{ position: "relative", height: 260, minHeight: 0, width: "100%", flex: 1 }}>
            <div style={{ position: "absolute", inset: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: "var(--radius-md)", border: "none", boxShadow: "var(--shadow-md)" }}
                    formatter={(val: any) => [formatCurrency(val), "Total"]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
