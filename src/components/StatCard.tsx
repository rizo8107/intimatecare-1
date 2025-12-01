import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
}

export function StatCard({ title, value, icon: Icon, bgColor, iconColor }: StatCardProps) {
  return (
    <div className={`${bgColor} rounded-2xl p-6 shadow-lg transition-transform hover:scale-105`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <h3 className="text-white text-3xl font-bold mt-2">{value}</h3>
        </div>
        <div className={`${iconColor} p-4 rounded-xl bg-white/20`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
  );
}
