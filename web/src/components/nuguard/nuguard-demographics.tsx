'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface DemographicEntry {
  value: string;
  users: number;
}

interface NuguardDemographicsProps {
  countries: DemographicEntry[];
  ages: DemographicEntry[];
  genders: DemographicEntry[];
}

const COLORS = ['#315c72', '#62C3F8', '#4a8fa8', '#7dd3f0', '#2a4f63', '#89deff'];

export function NuguardDemographics({ countries, ages, genders }: NuguardDemographicsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-1">
        <CardHeader className="border-b">
          <CardTitle>Top Countries</CardTitle>
          <CardDescription>Users by country (GA4)</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {countries.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={countries} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="value"
                  width={90}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(v: number) => [v.toLocaleString(), 'Users']}
                  cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <Bar dataKey="users" radius={[0, 4, 4, 0]}>
                  {countries.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-sm text-muted-foreground text-center">No country data</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Age Brackets</CardTitle>
          <CardDescription>Users by age (GA4)</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {ages.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ages} margin={{ left: 0, right: 8 }}>
                <XAxis dataKey="value" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(v: number) => [v.toLocaleString(), 'Users']}
                  cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <Bar dataKey="users" radius={[4, 4, 0, 0]}>
                  {ages.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-sm text-muted-foreground text-center">No age data</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Gender</CardTitle>
          <CardDescription>Users by gender (GA4)</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {genders.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={genders} margin={{ left: 0, right: 8 }}>
                <XAxis dataKey="value" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(v: number) => [v.toLocaleString(), 'Users']}
                  cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <Bar dataKey="users" radius={[4, 4, 0, 0]}>
                  {genders.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-sm text-muted-foreground text-center">No gender data</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
