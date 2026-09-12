import React from "react";
import { Link } from "react-router-dom";
import Base from "../components/Base";
import {
  Briefcase,
  Building2,
  UserCheck,
  CalendarCheck,
  FileSpreadsheet,
  CreditCard,
  FileText,
  Database,
  ArrowRight,
  ShieldCheck,
  Settings,
} from "lucide-react";

export default function MasterData() {
  const masterModules = [
    {
      title: "Accounts & Roles",
      description: "Manage system staff accounts, user credentials, access privileges, and custom role permissions.",
      path: "/accounts",
      icon: Briefcase,
      tag: "User Management",
      color: "bg-blue-50 text-blue-600 border-blue-100",
    },
    {
      title: "Companies Master",
      description: "Company profiles, registration details, compliance IDs, and site/branch configurations.",
      path: "/companies",
      icon: Building2,
      tag: "Entities",
      color: "bg-indigo-50 text-indigo-600 border-indigo-100",
    },
    {
      title: "Employees Master",
      description: "Employee directories, designation, KYC documents, UAN, ESIC, and salary structure details.",
      path: "/employees",
      icon: UserCheck,
      tag: "Workforce",
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    },
    {
      title: "Attendance & Sites",
      description: "Company-wise monthly muster records, shift attendance logs, and daily presence tracking.",
      path: "/attendance",
      icon: CalendarCheck,
      tag: "Operations",
      color: "bg-amber-50 text-amber-600 border-amber-100",
    },
    {
      title: "Wage Sheet Records",
      description: "Monthly wage calculations, overtime computation, deductions, and statutory compliance worksheets.",
      path: "/wage-sheet",
      icon: FileSpreadsheet,
      tag: "Finance",
      color: "bg-teal-50 text-teal-600 border-teal-100",
    },
    {
      title: "Statutory Compliances",
      description: "PF, ESIC, PT, LWF filings, monthly compliance sheets, and verification documentation.",
      path: "/compliances",
      icon: FileText,
      tag: "Compliance",
      color: "bg-purple-50 text-purple-600 border-purple-100",
    },
  ];

  return (
    <Base title="Master Data Hub">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-white/10 rounded-xl">
                <Database className="w-5 h-5 text-indigo-300" />
              </span>
              <span className="text-xs uppercase tracking-wider font-bold text-slate-300">
                Centralized Repository
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Master Data Management
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Configure and maintain core database records, entity profiles, roles, and administrative master records across Balaji InfraTech.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/accounts"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-900 rounded-xl font-semibold text-sm hover:bg-slate-100 transition shadow-sm"
            >
              <Settings className="w-4 h-4" />
              <span>Manage Accounts</span>
            </Link>
          </div>
        </div>

        {/* Master Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {masterModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.title}
                to={mod.path}
                className="group relative bg-white rounded-2xl p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl border ${mod.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                      {mod.tag}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    {mod.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 group-hover:text-indigo-600">
                  <span>Open Master</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </Base>
  );
}
