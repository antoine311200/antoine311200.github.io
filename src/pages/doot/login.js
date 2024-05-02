import React, { useState, useEffect, useRef, useContext } from "react";
import sha256 from 'crypto-js/sha256';
import axios from 'axios';
import { Spinner } from "@material-tailwind/react";

import { DootContext } from "./dootcontext";
import { Doot } from "./card";

const DootConnection = () => {
    const { isConnected, setIsConnected, doots, setDoots, currentUser, setCurrentUser } = useContext(DootContext);
    const [loginPage, setLoginPage] = useState(true);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loginError, setLoginError] = useState('');
    const [registerError, setRegisterError] = useState('');
    const [spinner, setSpinner] = useState(false);

    const loadLoginPage = () => {
        setLoginPage(true);
        setLoginError('');
        setRegisterError('');
    }

    const loadRegisterPage = () => {
        setLoginPage(false);
        setLoginError('');
        setRegisterError('');
    }

    const handleLogin = () => {
        setLoginError('');
        setSpinner(true);

        if (username.length === 0 || password.length === 0) {
            setLoginError('Please fill in all fields');
            setSpinner(false);
            return;
        }

        const hash = sha256(password).toString();
        const response = axios.post('http://localhost:5000/login', {
            username: username,
            password: hash
        });

        response.then((res) => {
            if (res.data.success) {
                setCurrentUser(res.data.user);
                setDoots(res.data.doots.map(
                    doot => new Doot(doot.id, doot.title, doot.description, doot.tags, doot.image, doot.links)
                ));
                setIsConnected(true);
            }
            else setLoginError(res.data.message);

            setSpinner(false);
        }).catch((err) => {
            console.log(err);

            setSpinner(false);
        });
    }

    const handleRegister = () => {
        setRegisterError('');
        setSpinner(true);

        if (email.length === 0 || username.length === 0 || password.length === 0 || confirmPassword.length === 0) {
            setRegisterError('Please fill in all fields');
            setSpinner(false);
            return;
        }

        const hash = sha256(password).toString();
        const confirmHash = sha256(confirmPassword).toString();

        if (hash !== confirmHash) {
            setRegisterError('Passwords do not match');
            setSpinner(false);
            return;
        }

        const response = axios.post('http://localhost:5000/register', {
            email: email,
            username: username,
            password: hash
        });

        response.then((res) => {
            if (res.data.success) setIsConnected(true);
            else setRegisterError(res.data.message);

            setSpinner(false);
        }).catch((err) => {
            console.log(err);

            setSpinner(false);
        });
    }

    return (
        // Login container
        <div className="container mx-auto flex flex-col items-center md:mt-24">
            {loginPage ? <div className="flex flex-col items-center md:w-1/3 mx-auto gap-y-4 bg-slate-800 p-6 md:p-7 rounded-lg">
                <div className="text-white text-center leading-9 tracking-tight text-lg font-medium">Connect to your <span className="font-semibold from-yellow-400 to-lime-400 bg-gradient-to-r bg-clip-text text-transparent">Doot</span> account</div>
                <div className="mt-5 md:mt-10 md:w-3/4 space-y-4 md:space-y-6">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium leading-6 text-gray-200">Username</label>
                        <div className="mt-2">
                            <input id="username" name="username" type="text" required className="px-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-yellow-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-lime-400" onChange={(e) => setUsername(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between">
                            <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-200">Password</label>
                            <div className="text-sm font-medium leading-6 text-yellow-400 hover:text-yellow-500 transition duration-100 ">
                                <a href="#/doot" className="">Forgot password?</a>
                            </div>
                        </div>
                        <div className="mt-2">
                            <input id="password" name="password" type="password" required className="px-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-yellow-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-lime-400" onChange={(e) => setPassword(e.target.value)} />
                        </div>
                    </div>

                    <div className="text-sm font-medium leading-6 text-gray-200 text-center">
                        Don't have an account? <button className="text-yellow-400 hover:text-yellow-500 transition duration-100" onClick={() => loadRegisterPage()}> Sign up</button>
                    </div>

                    <div>
                        <button className="w-full font-semibold py-2 rounded text-white bg-yellow-500 hover:bg-yellow-400 transition duration-300" onClick={() => handleLogin()}>
                            {!spinner ? <span>Login</span> : <Spinner className="m-auto animate-[spin_0.6s_linear_infinite] text-slate-200"/>}
                        </button>
                    </div>
                    {(loginError.length > 0) && <div className="text-red-400 text-center">{loginError}</div>}
                </div>
            </div>


            : <div className="flex flex-col items-center md:w-1/3 mx-auto gap-y-4 bg-slate-800 p-6 md:p-7 rounded-lg">
                <div className="text-white text-center leading-9 tracking-tight text-lg font-medium">Register a new <span className="font-semibold from-yellow-400 to-lime-400 bg-gradient-to-r bg-clip-text text-transparent">Doot</span> account</div>
                <div className="mt-3 md:mt-6 md:w-3/4 space-y-3 md:space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-200">Email address</label>
                        <div className="mt-2">
                            <input id="email" name="email" type="text" required className="px-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-yellow-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-lime-400" onChange={(e) => setEmail(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium leading-6 text-gray-200">Username</label>
                        <div className="mt-2">
                            <input id="username" name="username" type="text" required className="px-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-yellow-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-lime-400" onChange={(e) => setUsername(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between">
                            <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-200">Password</label>
                        </div>
                        <div className="mt-2">
                            <input id="password" name="password" type="password" required className="px-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-yellow-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-lime-400" onChange={(e) => setPassword(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between">
                            <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-200">Confirm password</label>
                        </div>
                        <div className="mt-2">
                            <input id="password" name="password" type="password" required className="px-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-yellow-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-lime-400" onChange={(e) => setConfirmPassword(e.target.value)} />
                        </div>
                    </div>

                    <div className="text-sm font-medium leading-6 text-gray-200 text-center">
                        Already have an account? <button className="text-yellow-400 hover:text-yellow-500 transition duration-100" onClick={() => loadLoginPage()}> Login</button>
                    </div>

                    <div>
                        <button className="w-full font-semibold py-2 rounded text-white bg-yellow-500 hover:bg-yellow-400 transition duration-300" onClick={() => handleRegister()}>
                        {!spinner ? <span>Create account</span> : <Spinner className="m-auto animate-[spin_0.6s_linear_infinite] text-slate-200"/>}</button>
                    </div>
                    {(registerError.length > 0) &&<div className="text-red-400 text-center">{registerError}</div>}
                </div>
            </div>}
        </div>

    )
}

export default DootConnection;