"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Point = { month: string; revenue?: number; members?: number };

export function AnalyticsCharts({
  revenue,
  growth,
}: {
  revenue: Point[];
  growth: Point[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-sky/20 shadow-sm shadow-sky/10">
        <CardHeader>
          <CardTitle>Monthly Revenue</CardTitle>
          <CardDescription>Paid memberships over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenue}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff5a1f" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ff5a1f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#d7e3f0" />
              <XAxis dataKey="month" stroke="#5b6b7c" fontSize={12} />
              <YAxis
                stroke="#5b6b7c"
                fontSize={12}
                tickFormatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value ?? 0)), "Revenue"]}
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #d7e3f0",
                  borderRadius: 8,
                  color: "#0f1b2d",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#ff5a1f"
                fill="url(#rev)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-indigo/20 shadow-sm shadow-indigo/10">
        <CardHeader>
          <CardTitle>Member Growth</CardTitle>
          <CardDescription>New joiners by month</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={growth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d7e3f0" />
              <XAxis dataKey="month" stroke="#5b6b7c" fontSize={12} />
              <YAxis stroke="#5b6b7c" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #d7e3f0",
                  borderRadius: 8,
                  color: "#0f1b2d",
                }}
              />
              <Bar dataKey="members" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
