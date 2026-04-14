import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { RefreshCw, TrendingUp, DollarSign } from 'lucide-react'; 
import axios from 'axios'; 

const Global = () => {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({ totalCost: 0, headcount: 0, projection: 0 });
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [glSummary, setGlSummary] = useState([]);
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
        setLoading(true);
        const token = localStorage.getItem('user_token');
        if (!token) { setLoading(false); return; }

        const response = await axios.get('http://127.0.0.1:8000/api/payroll/list', {
            headers: { Authorization: `Bearer ${token}` }
        });

        // DEBUG: Bach tchouf d-data kifach dayra f Console
        console.log("Data Backend:", response.data);

        if (response.data && response.data.length > 0) {
            calculateDashboard(response.data);
        } else {
            // Ila makanch data, n-sffrou koulchi
            setKpi({ totalCost: 0, headcount: 0, projection: 0 });
            setMonthlyData([]);
            setCategoryData([]);
            setGlSummary([]);
        }
        setLoading(false);
    } catch (error) { console.error(error); setLoading(false); }
  };

  const calculateDashboard = (currentData) => {
      let totalMonthlyCost = 0;
      const catCounts = { "Direct": 0, "Indirect": 0, "Support": 0, "SGA": 0 };
      
      const glMetrics = {
          "Basic Salaries (7310000)": 0,
          "Social Security (7370010)": 0,
          "Medical Benefits (7415000)": 0,
          "Employee Transport (7428000)": 0,
          "Accruals & Others (AT/Eid)": 0
      };

      // Helper bach n-jebdou l-valeur wakha tkon smya mbedla chwiya
      // Ex: "Base Salary" ou "base_salary" ou "Base salary"
      const getVal = (row, ...keys) => {
          for (let k of keys) {
              if (row[k] !== undefined && row[k] !== null) return row[k];
          }
          return 0;
      };

      const parseVal = (val) => {
          if (typeof val === 'number') return val;
          if (typeof val === 'string') return parseFloat(val.replace(/\s/g, '').replace(',', '.')) || 0;
          return 0;
      };

      currentData.forEach(row => {
          // 1. Fetch Values (Check multiple key variations)
          const base = parseVal(getVal(row, "Base Salary", "Base salary", "base_salary"));
          const transport = parseVal(getVal(row, "indémnité de tsport", "Ind Transport", "transport_allowance"));
          const panier = parseVal(getVal(row, "Ind. de panier", "Ind. de Panier", "panier"));
          
          const gross = base + transport + panier;

          // 2. Social Charges (Approximation rapide pour Dashboard)
          const cnss = (Math.min(gross, 6000) * 0.0898) + (gross * 0.1437);
          const amo = (Math.min(gross, 30000) * 0.0232) + (gross * 0.00749);
          
          // 3. Others
          const cimr = gross * 0.06;
          const at = gross * 0.0033;
          const eid = 200; 

          // Aggregation
          glMetrics["Basic Salaries (7310000)"] += base;
          glMetrics["Social Security (7370010)"] += cnss;
          glMetrics["Medical Benefits (7415000)"] += amo;
          glMetrics["Employee Transport (7428000)"] += transport;
          glMetrics["Accruals & Others (AT/Eid)"] += (cimr + at + eid);

          const rowCost = gross + cnss + amo + cimr + at + eid;
          totalMonthlyCost += rowCost;

          // Category mapping (Flexible)
          const catRaw = getVal(row, "Unite", "Category", "category", "Department", "Depart");
          const cat = (catRaw || "Autre").toString().trim().toLowerCase();

          if (cat.includes('direct')) catCounts["Direct"]++;
          else if (cat.includes('indirect')) catCounts["Indirect"]++;
          else if (cat.includes('support') || cat.includes('logistics')) catCounts["Support"]++;
          else if (cat.includes('sga') || cat.includes('hr') || cat.includes('finance')) catCounts["SGA"]++;
          else catCounts["Indirect"]++; // Default fallback
      });

      setKpi({
          totalCost: totalMonthlyCost,
          headcount: currentData.length,
          projection: totalMonthlyCost * 12
      });

      setGlSummary(Object.entries(glMetrics).map(([name, value]) => ({ name, value })));

      setCategoryData([
          { name: 'Direct', value: catCounts["Direct"] },
          { name: 'Indirect', value: catCounts["Indirect"] },
          { name: 'Support', value: catCounts["Support"] },
          { name: 'SGA', value: catCounts["SGA"] },
      ].filter(i => i.value > 0));

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      setMonthlyData(months.map(m => ({ name: m, Actual: totalMonthlyCost, Projected: totalMonthlyCost * 1.05 })));
  };

  return (
    <div className="max-w-7xl mx-auto mt-6 px-4 mb-20 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Financial Reporting Dashboard</h2>
            <p className="text-gray-500 text-sm font-medium">Consolidation par codes GL (General Ledger).</p>
          </div>
          <button onClick={fetchData} className="bg-white text-gray-600 px-4 py-2 rounded-lg hover:shadow transition shadow-sm border border-gray-200 flex items-center gap-2">
             <RefreshCw size={18} className={loading ? "animate-spin" : ""}/> Actualiser
          </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-600 border">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total Monthly Cost</p>
            <h3 className="text-2xl font-black text-gray-800">
                {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(kpi.totalCost)}
            </h3>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-emerald-500 border">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total Headcount</p>
            <h3 className="text-2xl font-black text-gray-800">{kpi.headcount}</h3>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-500 border">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Annual Budget Projection</p>
            <h3 className="text-2xl font-black text-gray-800">
                {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(kpi.projection)}
            </h3>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Chart 1: Actual vs Budget */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-80">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
               <TrendingUp size={18} className="text-green-500"/> Evolution Financière
            </h3>
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    formatter={(value) => new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(value)}
                  />
                  <Area type="monotone" dataKey="Actual" stroke="#3b82f6" fill="url(#colorActual)" strokeWidth={3} />
                  <Area type="monotone" dataKey="Projected" stroke="#e5e7eb" fill="transparent" strokeDasharray="5 5" />
               </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 2: workforce */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-80">
            <h3 className="font-bold text-gray-800 mb-4">Répartition par Catégorie</h3>
            <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} dataKey="value" paddingAngle={8}>
                     {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={4} />
                     ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" verticalAlign="bottom" height={36}/>
               </PieChart>
            </ResponsiveContainer>
          </div>
      </div>

      {/* --- FINANCIAL CONSOLIDATION (GL STRUCTURE) --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
              <DollarSign size={18} className="text-gray-400"/>
              <h3 className="font-bold text-gray-800">Financial Consolidation (Structure GL Accounts)</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {glSummary.map((item, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-100 transition hover:border-blue-200">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-2 truncate" title={item.name}>{item.name}</p>
                      <p className="text-lg font-bold text-blue-900">
                        {new Intl.NumberFormat('fr-MA').format(item.value)}
                      </p>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

export default Global;