import React, { useEffect, useState } from 'react';
import convo from '../images/convo.png';
import '../styles/home.css'; // Import the CSS file

const Home = () => {
    const [userName, setUserName] = useState(null);

    const userHome = async () => {
        try {
            const res = await fetch("/getdata", {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json"
                },
                credentials: "include"
            });

            if (res.status !== 200) {
                const error = new Error('Failed to fetch');
                throw error;
            }

            const data = await res.json();
            setUserName(data.name);
        } catch (err) {
            console.log(err);
        }
    }

    useEffect(() => {
        userHome();
    }, [])

    return (
        <div className="home-container">
            <div className="home-content">
                <div className="image-container">
                    <img src={convo} alt="Conversation" className="img-fluid" />
                </div>
                <div className="text-container">
                    {userName ? (
                        <p className='welcome-text'>Hello {userName}! Welcome Back!!</p>
                    ) : (
                        <p className='welcome-text'>Please login to file a grievance</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Home;
