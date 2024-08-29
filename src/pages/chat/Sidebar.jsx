import { useEffect, useState } from "react";
import style from "./chat.module.css";
import threeDots from "./images/threedots-icon.svg";
import addIcon from "./images/add-icon.svg";
import exitIcon from "./images/exit-icon.svg";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

export default function Sidebar({ onSelectChat, onNewChat }) {
  const [username, setUsername] = useState("");
  const [todayChats, setTodayChats] = useState([]);
  const [yesterdayChats, setYesterdayChats] = useState([]);
  const navigate = useNavigate();
  useEffect(() => {
    // console.log(todayChats);
    // console.log(yesterdayChats);
  }, [todayChats, yesterdayChats]);

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }

    const exampleTodayChats = [
      {
        id: uuidv4(),
        user: "What are the top priorities for retail companies in 2024 according to Deloitte's Global Retail Outlook?",
        bot: "According to Deloitte's Global Retail Outlook 2024, the top priorities for retail companies include coping with inflationary pressures, managing systemic challenges such as climate change, a shrinking labor force, and supply chain pressures. Retailers are also focusing on opportunities founded in technology, such as the emergence of generative AI, to reduce costs, improve productivity, and enhance the customer experience. Additionally, the industry is optimistic about revenue growth and operating profit margins, with a significant focus on e-commerce profitability and diversification into higher-margin revenue streams to boost operating margins.",
      },
      {
        id: uuidv4(),
        user: "What role does artificial intelligence play in the future of retail according to the Deloitte?",
        bot: "According to Deloitte, artificial intelligence (AI) plays several crucial roles in the future of retail. AI can help reduce costs by improving operational efficiency, such as in supply chain management and customer service. It enhances the customer experience by offering personalized recommendations, improving product information, and supporting virtual and augmented reality for better decision-making. Additionally, AI can assist in automating order processing, tracking, and delivery, as well as analyzing customer data to provide deeper insights and more empathetic interactions. Overall, AI is seen as a key enabler for retailers to optimize costs, enhance customer engagement, and drive growth.",
      },
    ];
    const exampleYesterdayChats = [
      {
        id: uuidv4(),
        user: "How in 2023 have African and Middle Eastern retailers performed in terms of retail revenue growth?",
        bot: "In 2023, African and Middle Eastern retailers experienced an 8.6% growth in retail revenue. This performance marked a notable improvement from the previous year, transitioning from a net operating loss of 1.1% in FY2020 to a net profit margin of 1.5% in FY2021. The top five retailers in the region increased their share of total retail revenues from 61% to 63%, driven by double-digit growth for companies like Steinhoff, BİM Birleşik Mağazalar, and A101 Yeni Mağazacılık.",
      },
    ];

    localStorage.setItem("todayChats", JSON.stringify(exampleTodayChats));
    localStorage.setItem(
      "yesterdayChats",
      JSON.stringify(exampleYesterdayChats)
    );

    // Load chats from localStorage
    const loadChats = () => {
      const todayChats = JSON.parse(localStorage.getItem("todayChats")) || [];
      const yesterdayChats =
        JSON.parse(localStorage.getItem("yesterdayChats")) || [];
      setTodayChats(todayChats);
      setYesterdayChats(yesterdayChats);
    };

    loadChats();
  }, []);

  const handleLogout = () => {
    const chatKey = `chat_${new Date().toISOString().split("T")[0]}`;

    localStorage.removeItem("username");
    localStorage.removeItem("messages");
    localStorage.removeItem("todayChats");
    localStorage.removeItem("yesterdayChats");
    localStorage.removeItem("currentChat");
    localStorage.removeItem(chatKey);
    navigate("/");
  };

  return (
    <>
      <div className={style.innerList}>
        <div className={style.logoDiv}>{/* <p>DMT.GPT</p> */}</div>
        <div className={style.chatContainer}>
          <div className={style.newChatContainer}>
            <button
              className={style.newChat}
              id="newChatButton"
              onClick={onNewChat}
            >
              <span>New Chat</span>
              <img src={addIcon} alt="Add Icon" />
            </button>
            <span id="newChatName" className={style.newChatName} />
            <button
              className={style.activeChat}
              id="activeChatButton"
              onClick={() => onSelectChat(null)}
            >
              <span>This is the active chat...</span>
              <img src={threeDots} alt="Three Dots Icon" />
            </button>
          </div>
          <div className={style.listContainer}>
            <div>
              <p>Today</p>
              <ul id="todayChats">
                {todayChats?.map((chat, index) => (
                  <li key={index} onClick={() => onSelectChat(chat)}>
                    {chat.user}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p>Yesterday</p>
              <ul id="yesterdayChats">
                {yesterdayChats?.map((chat, index) => (
                  <li key={index} onClick={() => onSelectChat(chat)}>
                    {chat?.user}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className={style.bottomUser}>
        <div className={style.userDiv}>
          <div>
            <p className={style.welcomeMessage}>{username || "User"}</p>
          </div>
          <img
            src={exitIcon}
            className={style.logout}
            onClick={handleLogout}
            alt="Logout Icon"
          />
        </div>
      </div>
    </>
  );
}
