import React, { useState, useEffect, useRef, useContext } from "react";
import sha256 from 'crypto-js/sha256';
import axios from 'axios';

import { DootContext } from "./dootcontext";


const DootConnection = () => {
    const { isConnected, setIsConnected } = useContext(DootContext);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const [error, setError] = useState('');

    const handleLogin = () => {
        const hash = sha256(password).toString();
        const response = axios.post('http://localhost:5000/login', {
            username: username,
            password: hash
        });

        response.then((res) => {
            if (res.data.success) setIsConnected(true);
            else setError(res.data.message);
        }).catch((err) => {
            console.log(err);
        });

    }

    return (
        // Login container
        <div className="container mx-auto flex flex-col items-center md:mt-24">
            <div className="flex flex-col items-center md:w-1/3 mx-auto gap-y-4 bg-slate-800 p-6 md:p-7 rounded-lg">
                <div className="text-white text-center leading-9 tracking-tight text-lg font-medium">Connect to your <span className="font-semibold from-yellow-400 to-lime-400 bg-gradient-to-r bg-clip-text text-transparent">Doot</span> account</div>
                <div className="mt-5 md:mt-10 md:w-3/4 space-y-4 md:space-y-6">
                    <div>
                        <label for="username" className="block text-sm font-medium leading-6 text-gray-200">Username</label>
                        <div className="mt-2">
                            <input id="username" name="username" type="text" required className="px-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-yellow-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-lime-400" onChange={(e) => setUsername(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <div class="flex items-center justify-between">
                            <label for="password" className="block text-sm font-medium leading-6 text-gray-200">Password</label>
                            <div className="text-sm font-medium leading-6 text-yellow-400 hover:text-yellow-500 transition duration-100 ">
                                <a href="#/doot" className="">Forgot password?</a>
                            </div>
                        </div>
                        <div className="mt-2">
                            <input id="password" name="password" type="password" required className="px-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-yellow-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-lime-400" onChange={(e) => setPassword(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <button className="mt-4 w-full font-semibold py-2 rounded text-white bg-yellow-500 hover:bg-yellow-400 transition duration-300" onClick={() => handleLogin()}>Login</button>
                    </div>
                    {(error.length > 0) &&<div className="text-red-400 text-center">{error}</div>}
                </div>
            </div>
        </div>

    )
}

export default DootConnection;