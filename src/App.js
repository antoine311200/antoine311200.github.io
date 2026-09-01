import React, { useEffect } from 'react';

import './App.css';

import Template from './components/template';

export default function App() {
  useEffect(() => {
    document.title = `Antoine Debouchage - Machine Learning, Quantum Computing, Mathematics - Personal Website`;
  }, []);

  return (
    <Template>
      <main className="relative z-10 flex flex-col items-center justify-center px-6 py-10 sm:py-32 lg:py-10">
        <div className="relative">
          <div className="mx-auto w-40 h-40 sm:w-52 sm:h-52 rounded-full overflow-hidden ring-4 ring-gray-900/30 shadow-xl bg-gradient-to-br from-white/5 via-white/3 to-white/2">
            <img
              src="/images/profile_picture.jpg"
              alt="Antoine Debouchage"
              className="w-full h-full object-cover"
            />
          </div>

          {/* <div className="absolute -right-14 -bottom-2 inline-flex items-center gap-2 rounded-full bg-gray-800/60 px-2 py-1 text-xs font-thin text-gray-200 backdrop-blur-md shadow-md whitespace-nowrap">
            <span className="hidden sm:inline">『井の中の蛙、大海を知らず。されど空の深さを知る』</span>
          </div> */}
        </div>

        <header className="mt-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-100 leading-tight">Antoine Debouchage</h1>
          <p className="mt-3 text-base sm:text-2xl text-gray-200">
            Financial Mathematics · Machine Learning · Quantum Computing
          </p>
        </header>

        <section className="mt-10 max-w-2xl text-center text-sm text-gray-300 leading-relaxed">
          <p>
            I am a <span className="font-semibold text-gray-100">PhD student in Financial Mathematics</span> (CIFRE) with <a href="https://www.barclays.com/" className="text-orange-300 hover:text-orange-400">Barclays</a> and <a href="http://www.math-evry.cnrs.fr/doku.php" className="text-orange-300 hover:text-orange-400">LaMME</a>,
            working on Statistical Learning for Quantitative Finance. 
            Before my PhD, I completed a <span className="font-semibold text-gray-100">Master degree in Engineering</span> at <a href="https://www.centralesupelec.fr/" className="text-orange-300 hover:text-orange-400">CentraleSupélec</a> in Mathematics and Data Science, 
            and the <a href="https://www.master-mva.com/" className="text-orange-300 hover:text-orange-400"><span className="font-semibold text-gray-100">MVA Master of Research</span></a> at <a href="https://www.ens-paris-saclay.fr/" className="text-orange-300 hover:text-orange-400">ENS Paris-Saclay</a>.
          </p>
        </section>
      </main>
    </Template>
  );
}
