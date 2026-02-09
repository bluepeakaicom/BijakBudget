
import React, { useState } from 'react';
import { ArrowLeft, CreditCard, Search, CheckCircle2, XCircle, Clock, DollarSign, Activity, History, ShieldCheck, Loader2, User, Calendar, Wallet } from 'lucide-react';
import { checkMySaraStatus, MySaraStatus } from '../services/mysara';

interface MySaraCheckProps {
  onBack: () => void;
}

export const MySaraCheck: React.FC<MySaraCheckProps> = ({ onBack }) => {
  const [mykad, setMykad] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MySaraStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mykad.length < 12) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await checkMySaraStatus(mykad);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to verify MyKad. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Visual formatter for MyKad (000000-00-0000)
  const formatDisplayValue = (val: string) => {
      if (val.length > 8) return `${val.slice(0, 6)}-${val.slice(6, 8)}-${val.slice(8)}`;
      if (val.length > 6) return `${val.slice(0, 6)}-${val.slice(6)}`;
      return val;
  };

  return (
    <div className="w-full space-y-6 animate-fade-in pb-24">
      
      {/* Header */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100 sticky top-0 z-10 backdrop-blur-md bg-white/90">
         <button 
           onClick={onBack}
           className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
         >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
         </button>
         <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
               MySARA Portal
               <ShieldCheck className="w-4 h-4 text-blue-600" />
            </h2>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">MyKasih Foundation Checker</p>
         </div>
      </div>

      {/* Main Content Area */}
      {!result ? (
        // --- INPUT STATE ---
        <div className="bg-white rounded-2xl shadow-xl shadow-blue-900/10 border border-slate-200 overflow-hidden relative">
            <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400/20 rounded-full -ml-10 -mb-10 blur-2xl"></div>
                
                <div className="relative z-10 text-center">
                    <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/20 shadow-lg">
                        <CreditCard className="w-8 h-8 text-yellow-400" />
                    </div>
                    <h3 className="font-bold text-2xl mb-2 tracking-tight">Sumbangan Asas Rahmah</h3>
                    <p className="text-blue-100 text-sm max-w-xs mx-auto leading-relaxed opacity-90">
                        Check your SARA subsidy balance, eligibility status, and payment schedule instantly.
                    </p>
                </div>
            </div>

            <div className="p-8">
                <form onSubmit={handleCheck} className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                            MyKad Identification
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                            </div>
                            <input 
                                type="text" 
                                value={formatDisplayValue(mykad)}
                                onChange={(e) => setMykad(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                placeholder="Example: 850101-14-5566"
                                className="block w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-lg font-mono tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white focus:border-blue-500 transition-all shadow-inner"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 pl-1">
                            Enter 12 digits. Your data is processed securely and not stored.
                        </p>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading || mykad.length !== 12}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-3 group"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Verifying Details...
                            </>
                        ) : (
                            <>
                                <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                Check Status
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
      ) : (
        // --- RESULT STATE ---
        <div className="space-y-6 animate-slide-up">
            
            {/* Status Banner */}
            <div className={`rounded-xl p-4 border flex items-center gap-4 shadow-sm animate-pop-in ${
                result.isEligible 
                    ? 'bg-emerald-50 border-emerald-100' 
                    : 'bg-red-50 border-red-100'
            }`}>
                <div className={`p-3 rounded-full ${result.isEligible ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                    {result.isEligible ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                </div>
                <div>
                    <h3 className={`font-bold text-lg ${result.isEligible ? 'text-emerald-800' : 'text-red-800'}`}>
                        {result.isEligible ? "Eligibility Confirmed" : "Not Eligible"}
                    </h3>
                    <p className={`text-sm font-medium ${result.isEligible ? 'text-emerald-600' : 'text-red-600'}`}>
                        {result.isEligible 
                           ? "You are an active SARA recipient." 
                           : "No record found for this ID."}
                    </p>
                </div>
            </div>

            {/* ERROR DISPLAY */}
            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-3">
                    <XCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* ELIGIBLE CONTENT */}
            {result.isEligible && (
               <>
                 {/* DIGITAL CARD VISUAL */}
                 <div className="relative w-full aspect-[1.586/1] bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-2xl shadow-2xl overflow-hidden text-white p-6 flex flex-col justify-between group perspective transform transition-transform hover:scale-[1.02] duration-500">
                    {/* Background Patterns & Shimmer */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/10 transition-colors"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full -ml-10 -mb-10 blur-2xl"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    
                    {/* Holographic Sheen Effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-[1.5s] ease-in-out pointer-events-none"></div>

                    {/* Card Top */}
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-yellow-400/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-yellow-400/50 shadow-sm">
                                <span className="text-2xl drop-shadow-sm">🇲🇾</span>
                            </div>
                            <div>
                                <p className="text-[10px] text-blue-200 uppercase tracking-widest font-bold">Malaysia Madani</p>
                                <p className="text-sm font-bold text-white tracking-wide shadow-black drop-shadow-sm">MyKasih SARA</p>
                            </div>
                        </div>
                        <Activity className="w-6 h-6 text-emerald-400 animate-pulse drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    </div>

                    {/* Card Middle - Balance */}
                    <div className="relative z-10 my-auto">
                        <p className="text-xs text-blue-300 font-medium mb-1">Available Balance</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-medium text-blue-200">RM</span>
                            <span className="text-5xl font-black tracking-tight text-white drop-shadow-lg">
                                {result.balance.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* Card Bottom */}
                    <div className="relative z-10">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] text-blue-300 uppercase tracking-wider mb-1">Cardholder</p>
                                <p className="font-bold text-lg tracking-wide uppercase truncate max-w-[200px] text-shadow-sm">
                                    {result.recipientName || "WARGA MALAYSIA"}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-blue-300 uppercase tracking-wider mb-0.5">MyKad</p>
                                <p className="font-mono text-sm text-blue-100 tracking-widest opacity-90">
                                    {formatDisplayValue(mykad).replace(/\d{4}$/, '****')}
                                </p>
                            </div>
                        </div>
                    </div>
                 </div>

                 {/* Quick Stats Grid */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2">
                           <div className="p-1.5 bg-orange-100 rounded-lg">
                               <Clock className="w-4 h-4 text-orange-600" />
                           </div>
                           <span className="text-xs font-bold text-slate-500 uppercase">Next Credit</span>
                        </div>
                        <p className="text-base font-bold text-slate-800">{result.nextCreditDate}</p>
                        <p className="text-xs text-emerald-600 font-bold mt-0.5 bg-emerald-50 inline-block px-1.5 rounded">
                            +RM {result.monthlyAllowance}
                        </p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2">
                           <div className="p-1.5 bg-purple-100 rounded-lg">
                               <Wallet className="w-4 h-4 text-purple-600" />
                           </div>
                           <span className="text-xs font-bold text-slate-500 uppercase">Status</span>
                        </div>
                        <p className={`text-base font-bold ${result.status === 'Active' ? 'text-emerald-600' : 'text-red-500'}`}>
                           {result.status}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Auto-renewing</p>
                    </div>
                 </div>

                 {/* Transaction Timeline */}
                 <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50/50 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                           <History className="w-4 h-4 text-slate-500" />
                           <span className="text-sm font-bold text-slate-700">Recent Transactions</span>
                       </div>
                       <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">Last 30 Days</span>
                    </div>
                    
                    <div className="p-5">
                       {result.transactions.length > 0 ? (
                           <div className="relative space-y-0">
                               {/* Vertical Line */}
                               <div className="absolute left-[19px] top-2 bottom-4 w-0.5 bg-slate-100"></div>

                               {result.transactions.map((tx, idx) => (
                                   <div 
                                     key={idx} 
                                     className="relative pl-10 pb-6 last:pb-0 group animate-slide-up"
                                     style={{ animationDelay: `${idx * 100}ms` }}
                                   >
                                       {/* Timeline Dot */}
                                       <div className="absolute left-0 top-1 w-10 h-10 flex items-center justify-center">
                                           <div className="w-3 h-3 bg-white border-2 border-blue-500 rounded-full group-hover:bg-blue-500 transition-colors shadow-sm z-10 group-hover:scale-125 duration-300"></div>
                                       </div>
                                       
                                       {/* Content */}
                                       <div className="flex justify-between items-start">
                                           <div>
                                               <p className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{tx.merchant}</p>
                                               <div className="flex items-center gap-2 mt-0.5">
                                                   <Calendar className="w-3 h-3 text-slate-400" />
                                                   <p className="text-xs text-slate-500 font-medium">{tx.date}</p>
                                               </div>
                                           </div>
                                           <p className="text-sm font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                               - RM {tx.amount.toFixed(2)}
                                           </p>
                                       </div>
                                   </div>
                               ))}
                           </div>
                       ) : (
                           <div className="text-center py-8 opacity-60">
                               <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                               <p className="text-sm text-slate-500">No recent transactions.</p>
                           </div>
                       )}
                    </div>
                 </div>

                 {/* Tip Box */}
                 <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex gap-3 items-start animate-fade-in" style={{ animationDelay: '300ms' }}>
                    <div className="bg-indigo-100 p-1.5 rounded-full mt-0.5 shrink-0">
                        <DollarSign className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-indigo-800 uppercase tracking-wide mb-1">Usage Tip</p>
                        <p className="text-xs text-indigo-700 leading-relaxed">
                           SARA credit expires monthly. Ensure you use your allowance before <strong>{result.nextCreditDate}</strong> to avoid forfeiture.
                        </p>
                    </div>
                 </div>
               </>
            )}

            <button 
                onClick={() => setResult(null)}
                className="w-full py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors hover:bg-slate-50 rounded-xl active:scale-95"
            >
                Check Another ID
            </button>
        </div>
      )}

    </div>
  );
};
