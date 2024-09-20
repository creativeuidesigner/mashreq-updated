import { useState, useEffect, useRef, useLayoutEffect, useMemo } from "react";
import axios from "axios";
import style from "./chat.module.css";
import logo from "../login/logo.svg";
import toggleBar from "./images/bars-icon.svg";
import xIcon from "./images/xIcon.svg";
import sendIcon from "./images/send-icon.svg";
import micIcon from "./images/mic-icon.svg";
import attachIcon from "./images/attachIcon.svg";
import authorIcon from "./images/author-icon.svg";
import bigMicIcon from "./images/big-micIcon.svg";
import databaseIcon from "./images/databaseIcon.svg";
import documentIcon from "./images/documentIcon.svg";
import uploadFile from "./images/upload.svg";
import regenerateIcon from "./images/regenerateIcon.svg";
import angleUpIcon from "./images/angleUpIcon.svg";
import copyIcon from "./images/copyIcon.svg";
import Sidebar from "./Sidebar";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";
import React from "react";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { Chart, registerables } from "chart.js";
import { uploadFileAPI, uploadAudioAPI } from "../../connection/api/chat/chat";
import useMediaQuery from "../../customHook/useMediaQuery";
import { v4 as uuidv4 } from "uuid";
import { checkIsValidUser } from "../helper/auth.helper";
import "audio-recorder-polyfill";
import { useNavigate } from "react-router-dom";
import Loader from "../../components/Loader";
import {
  baseURLGenai,
  openAiURL,
  // baseURLGenaiDB,
  baseURL,
} from "../../connection/config/url";
import {
  AudioConfig,
  SpeechConfig,
  SpeechRecognizer,
  ResultReason,
  CancellationReason,
} from "microsoft-cognitiveservices-speech-sdk";

const API_KEY = process.env.REACT_APP_API_KEY;
const API_LOCATION = process.env.REACT_APP_API_LOCATION;
Chart.register(...registerables);

const speechConfig = SpeechConfig.fromSubscription(API_KEY, API_LOCATION);
let recognizer;

export default function Chat() {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [messages, setMessages] = useState([]);
  const [recognisedQuestion, setRecognisedQuestion] = useState("");
  const [recognisingQuestion, setRecognisingQuestion] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const chatMessagesRef = useRef();
  const mediaStreamRef = useRef(null);
  const [uploadModal, setUploadModal] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [tooltip, setTooltip] = useState("Copy");

  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  const isMobile = useMediaQuery("(max-width:650px)");
  const isTablet = useMediaQuery("(max-width:768px)");
  const isMidWidth = useMediaQuery("(min-width:769px) and (max-width:1000px)");
  const isLargeWidth = useMediaQuery(
    "(min-width:1001px) and (max-width:1361px)"
  );
  const navigate = useNavigate();
  const [isRecognising, setIsRecognising] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [cleanUpState, setCleanUpState] = useState(null);
  const [selectedValue, setSelectedValue] = useState("Database");
  const [displaySelectedValue, setDisplaySelectedValue] = useState(false);

  const options = [
    { value: "Database", label: "Database", icon: databaseIcon },
    { value: "Document", label: "Document", icon: documentIcon },
  ];

  const handleSelect = (value) => {
    setSelectedValue(value);
    setDisplaySelectedValue(false);
  };

  const textRef = useRef();

  useEffect(() => {
    const toggleButton = document.getElementById("toggleButton");
    if (toggleButton) {
      toggleButton.style.left = isSidebarVisible ? "300px" : "47px";
    }
  }, [isSidebarVisible]);

  const scrollToBottom = () => {
    chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
  };

  const isLoggedIn = async () => {
    const username = localStorage.getItem("username") || "User";
    const isValid = await checkIsValidUser(username);
    if (!isValid) {
      navigate("/");
    }
  };

  useEffect(() => {
    loadActiveChat();
    isLoggedIn();

    return () => {
      if (cleanUpState) {
        localStorage.setItem("messages", JSON.stringify(cleanUpState));
      }
    };
  }, []);

  const handleToggle = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const handleUploadFile = async (e) => {
    setUploadLoading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    uploadFileAPI(formData)
      .then((res) => {
        addMessage(`${res.filename} file uploaded successfully`, "bot");
        setUploadLoading(false);
        closeUpdateModal();
      })
      .catch((error) => {
        addMessage("Unable to upload pdf", "bot");
        setUploadLoading(false);
        closeUpdateModal();
      });
  };

  const handlePayloadChart = (inputString) => {
    return inputString.toLowerCase().includes("chart");
  };

  const getImageFromFileId = async (file_id) => {
    const headers = {
      Authorization: `Bearer ${process.env.REACT_APP_OPEN_AI_KEY}`,
    };
    const imageDetails = await axios.get(`${openAiURL}${file_id}/content`, {
      headers: headers,
      responseType: "blob",
    });
    const imageUrl = await URL.createObjectURL(
      new Blob([imageDetails.data], { type: "image/png" })
    );
    return imageUrl;
  };

  const handleSendMessageV2 = async (e) => {
    e.preventDefault();
    if (recognisedQuestion.trim() === "") return;
    setLoading(true);
    const username = localStorage.getItem("username") || "User";
    let url;

    if (selectedValue == "Document") {
      url = `${baseURL}q_a_rag_filtered`;
    } else {
      url = `${baseURLGenai}`;
    }

    let query = recognisedQuestion;

    if (query) {
      query +=
        ".If in response output is not array then provide me response in single line";
    }
    addMessage(recognisedQuestion, "user");
    setRecognisedQuestion("");
    setLastQuestion(recognisedQuestion);

    try {
      let apiResponse;
      let payloadDataText = handlePayloadChart(query);
      apiResponse = await axios.get(url, {
        params: {
          question: query,
          username: "genai@mashreq.com",
        },
      });

      const messagesCollection = [];
      const saveCollection = [];
      const responseData = apiResponse?.data?.return_values;

      // Function to process image entities
      const processImage = async (entity) => {
        if (entity?.type === "image_file") {
          const imageUrl = await getImageFromFileId(
            entity?.image_file?.file_id
          );
          saveCollection.push(`{{${entity?.image_file?.file_id}}}`);
          return `<img src="${imageUrl}" alt="${entity?.image_file?.file_id}"/> <br>`;
        }
      };

      // Function to process text entities
      const processText = (entity) => {
        if (entity?.type === "text") {
          const dataSet = entity.text.value.replace(/\n/g, "<br>");
          saveCollection.push(dataSet);
          return dataSet;
        }
      };

      // Check if the API response contains images and/or text
      if (responseData && Array.isArray(responseData.output)) {
        const processEntities = async () => {
          const promises = responseData.output.map(async (entity) => {
            if (entity.type === "image_file") {
              return processImage(entity);
            } else if (entity.type === "text") {
              return processText(entity);
            }
          });

          const messages = await Promise.all(promises);

          messages.forEach((message) => messagesCollection.push(message));
        };

        await processEntities();

        const concatenatedMessageSave = saveCollection.join("<br>");
        addMessage(concatenatedMessageSave, "bot");
        saveChat(recognisedQuestion, concatenatedMessageSave);
      } else if (typeof responseData?.output === "string") {
        // If no image, display the output text as a message
        const outputText = responseData.output.replace(/\n/g, "<br>");
        addMessage(outputText, "bot");
        saveChat(recognisedQuestion, outputText);
      } else {
        addMessage("No relevant data found for chart creation.", "bot");
      }
    } catch (error) {
      console.log("error", error);
      addMessage("Oops, some error occurred", "bot");
    } finally {
      setLoading(false);
    }
  };

  const addMessage = async (text, sender, type) => {
    const messageType = type ? type : "text";

    const newMessage = {
      text,
      sender,
      type: messageType,
      id: uuidv4(),
    };

    let domMessage = {
      text,
      sender,
      type: messageType,
      id: uuidv4(),
    };

    // console.log("messages", messages)
    // const domMessages = [...messages, newMessage];
    // localStorage.setItem("messages", JSON.stringify(domMessages));
    // setMessages(domMessages);

    // setMessages((prevMessages) => {
    //   const updatedMessages = [...prevMessages, newMessage];
    //   localStorage.setItem("messages", JSON.stringify(updatedMessages));
    //   return updatedMessages;
    // });

    if (sender == "bot") {
      const matches = await extractDynamicContent(domMessage.text);
      if (matches && matches.length > 0) {
        const fileId = matches[0];
        const imageURL = await getImageFromFileId(fileId);
        const imgVal = `<br><img src="${imageURL}" alt="${fileId}"/>`;
        domMessage.text = await domMessage.text.replace(
          /\{\{(.*?)\}\}/g,
          imgVal
        );
      }

      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages, domMessage];
        localStorage.setItem("messages", JSON.stringify(updatedMessages));
        return updatedMessages;
      });
    } else {
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages, newMessage];
        localStorage.setItem("messages", JSON.stringify(updatedMessages));
        return updatedMessages;
      });
    }

    // const prevPromise = messages.map( async (item) => {
    //   if(item.sender == "bot") {
    //     const matches = await extractDynamicContentImg(item.text);
    //     if(matches && matches.length > 0) {
    //       const imagetag = matches[0];
    //       const altValue = imagetag.match(/alt="([^"]*)"/);
    //       const fileId =  altValue ? altValue[1] : '';
    //       const regex = new RegExp(`<img[^>]*[^>]*>`, 'i');
    //       const newString = await item.text.replace(regex, `{{${fileId}}}`);
    //       return {
    //         ...item,
    //         text: newString
    //       }
    //     }else{
    //       return item
    //     }
    //   }else {
    //     return item
    //   }

    // });

    // const formattedPrevMessage = await Promise.all(prevPromise);
    // const updatedMessages = [...messages, newMessage];
    // localStorage.setItem("messages", JSON.stringify(updatedMessages));
    // const domMessages = [...formattedPrevMessage, domMessage];
    // const domMessages2 = [...messages, domMessage];
    // setMessages(domMessages2);
    if (sender == "bot") {
      setLoading(false);
    }
  };

  const regenerateMessage = async (answer) => {
    const chatKey = `chat_${new Date().toISOString().split("T")[0]}`;
    const todayChat = JSON.parse(localStorage.getItem(chatKey));

    const chat = todayChat.find((chat) => {
      const filteredText = chat?.bot.replace(/<[^>]*>/g, "");
      const filteredTextL2 = filteredText.replace(/{{[^}]*}}/g, "");

      const filteredAnswer = answer.replace(/<[^>]*>/g, "");
      const filteredAnswerL2 = filteredAnswer.replace(/{{[^}]*}}/g, "");

      if (filteredTextL2 == filteredAnswerL2) {
        return chat;
      }
    });
    if (!chat) return;
    const selectedQues = chat?.user;
    if (selectedQues.trim() === "") return;

    setLoading(true);
    const username = localStorage.getItem("username") || "User";

    let url;

    if (selectedValue == "Document") {
      url = `${baseURL}q_a_rag_filtered`;
    } else {
      url = `${baseURLGenai}`;
    }

    try {
      const apiResponse = await axios.get(url, {
        params: {
          question: selectedQues,
          username: "genai@mashreq.com",
        },
      });

      let payloadDataText = handlePayloadChart(selectedQues);

      const messagesCollection = [];
      const saveCollection = [];

      // Check if the 'output' field exists and is an array
      const output = apiResponse?.data?.return_values?.output;

      if (
        payloadDataText === true &&
        selectedValue !== "Document" &&
        Array.isArray(output)
      ) {
        const processEntity = async (entity) => {
          if (entity?.type === "text") {
            const dataSet = entity.text.value.replace(/\n/g, "<br>");
            saveCollection.push(dataSet);
            return dataSet;
          } else if (entity?.type === "image_file") {
            const imageUrl = await getImageFromFileId(
              entity?.image_file?.file_id
            );
            saveCollection.push(`{{${entity?.image_file?.file_id}}}`);
            return `<img src="${imageUrl}" alt="${entity?.image_file?.file_id}"/> <br>`;
          }
        };

        const processEntities = async () => {
          const promises = output.map(async (entity) => {
            const message = await processEntity(entity);
            return message;
          });

          const messages = await Promise.all(promises);
          messages.forEach((message) => messagesCollection.push(message));
        };

        processEntities().then(() => {
          const concatenatedMessageSave = saveCollection.join("<br>");
          addMessage(concatenatedMessageSave, "bot");
          saveChat(selectedQues, concatenatedMessageSave);
        });
      } else {
        // If no output array, fallback to plain text response
        const planText =
          (await apiResponse?.data?.return_values?.output) || apiResponse?.data;
        addMessage(planText, "bot");
        saveChat(selectedQues, planText);
      }
    } catch (error) {
      console.log("error", error);
      addMessage("Oops, some error occurred", "bot");
    }
  };

  const saveChat = (userMessage, botResponse) => {
    const chatKey = `chat_${new Date().toISOString().split("T")[0]}`;
    const chatSession = JSON.parse(localStorage.getItem(chatKey)) || [];
    chatSession.push({ user: userMessage, bot: botResponse });
    localStorage.setItem(chatKey, JSON.stringify(chatSession));
  };

  const extractDynamicContent = (str) => {
    const regex = /\{\{(.*?)\}\}/g;
    const matches = [];
    let match;
    while ((match = regex.exec(str)) !== null) {
      matches.push(match[1]); // Extract content between {{ }}
    }
    return matches;
  };

  const extractDynamicContentImg = (str) => {
    const regex = /<img.*?>/g;
    const matches = [];
    let match;
    while ((match = regex.exec(str)) !== null) {
      matches.push(match[0]); // Extract content between {{ }}
    }
    return matches;
  };

  const loadActiveChat = async () => {
    setChatLoading(true);
    const savedMessages = JSON.parse(localStorage.getItem("messages"));
    if (savedMessages) {
      // const botMessages = savedMessages.filter((i) => i?.sender == "bot");
      const parentPromise = savedMessages.map(async (message) => {
        if (message.sender == "bot") {
          // check if any image already exists
          const imgmatches = await extractDynamicContentImg(message.text);

          if (imgmatches && imgmatches.length > 0) {
            const imagetag = imgmatches[0];
            const altValue = imagetag.match(/alt="([^"]*)"/);
            const fileId = altValue ? altValue[1] : "";
            const regex = new RegExp(`<img[^>]*[^>]*>`, "i");
            message.text = await message.text.replace(regex, `{{${fileId}}}`);
          }
          const matches = await extractDynamicContent(message.text);
          if (matches && matches.length > 0) {
            // fornow we are limiting to a single image
            const fileId = matches[0];
            const imageURL = await getImageFromFileId(fileId);
            const imgVal = `<img src="${imageURL}" alt="${fileId}"/>`;
            const textMessage = await message.text.replace(
              /\{\{(.*?)\}\}/g,
              imgVal
            );

            return {
              ...message,
              text: textMessage,
            };
          } else {
            return message;
          }
        } else {
          return message;
        }
      });

      const formattedMessages = await Promise.all(parentPromise);
      // console.log("formattedMessages", formattedMessages);
      setMessages(formattedMessages);
      // chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
    setChatLoading(false);
  };

  const handleSelectChat = (chat) => {
    if (isMobile || isTablet) handleToggle();

    if (chat) {
      const chatMessages = [
        { text: chat.user, sender: "user", id: 1 },
        { text: chat.bot, sender: "bot", id: 2 },
      ];
      setMessages(chatMessages);
    } else {
      // loadActiveChat();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    const newChatName = `New Chat (${new Date().toLocaleString()})`;
    document.getElementById("newChatName").innerText = newChatName;

    // Clear localStorage or create a unique key for the new chat
    localStorage.removeItem("messages");
    localStorage.removeItem("currentChat");

    const newChat = {
      user: "",
      bot: "You started a new chat",
    };
    if (isMobile) handleToggle();

    localStorage.setItem("currentChat", JSON.stringify(newChat));
  };

  const recorderV3 = async () => {
    setRecognisedQuestion("");
    var constraints = {
      video: false,
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        sampleSize: 16,
        volume: 1,
      },
    };

    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext();
      const audioStreamSource = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.minDecibels = -45;
      audioStreamSource.connect(analyser);

      createRecognizer(stream);
      startRecognizer();

      detectSound(analyser);
    } catch (error) {
      console.log(err);
    }
  };

  const createRecognizer = (audioStream) => {
    const audioConfig = AudioConfig.fromStreamInput(audioStream);
    recognizer = new SpeechRecognizer(speechConfig, audioConfig);
    recognizer.recognizing = (s, e) => {
      setRecognisingQuestion(e.result.text);
      textRef.current.scrollTop = textRef.current.scrollHeight;
    };
    recognizer.recognized = (s, e) => {
      setRecognisingQuestion("");
      if (e.result.reason === ResultReason.RecognizedSpeech) {
        setRecognisedQuestion((recognisedText) => {
          if (recognisedText === "") {
            return `${e.result.text} `;
          } else {
            return `${recognisedText}${e.result.text} `;
          }
        });
        textRef.current.scrollTop = textRef.current.scrollHeight;
      } else if (e.result.reason === ResultReason.NoMatch) {
        // console.log("NOMATCH: Speech could not be recognized.")
      }
    };

    recognizer.canceled = (s, e) => {
      // console.log(`CANCELED: Reason=${e.reason}`)
      if (e.reason === CancellationReason.Error) {
      }
      recognizer.stopContinuousRecognitionAsync();
    };

    recognizer.sessionStopped = (s, e) => {
      // console.log("\n    Session stopped event.")
      recognizer.stopContinuousRecognitionAsync();
    };
  };

  const startRecognizer = () => {
    recognizer.startContinuousRecognitionAsync();
    setIsRecognising(true);

    // setTimeout(() => {
    //   console.log("stopping");
    //   stopRecognizer()
    // }, [8000])
  };

  const stopRecognizer = () => {
    setIsRecognising(false);
    mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    recognizer.stopContinuousRecognitionAsync();
  };

  const detectSound = (analyser) => {
    const bufferLength = analyser.frequencyBinCount;
    const domainData = new Uint8Array(bufferLength);
    let lastSoundTime = new Date().getTime();
    let DELAY_BETWEEN_DIALOGS = 2000; // 2 seconds

    const checkForSilence = () => {
      const currentTime = new Date().getTime();
      analyser.getByteFrequencyData(domainData);

      let soundDetected = false;
      for (let i = 0; i < bufferLength; i++) {
        if (domainData[i] > 0) {
          soundDetected = true;
          lastSoundTime = currentTime;
          break;
        }
      }

      if (
        !soundDetected &&
        currentTime > lastSoundTime + DELAY_BETWEEN_DIALOGS
      ) {
        console.log("STOPPED due to silence");
        stopRecognizer();
        return;
      }

      window.requestAnimationFrame(checkForSilence);
    };

    window.requestAnimationFrame(checkForSilence);
  };

  const openUpdateModal = () => {
    setUploadModal(true);
  };

  const closeUpdateModal = () => {
    setUploadModal(false);
  };

  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleCopyMessage = (message) => {
    // remove imagae from text
    const stringWithoutImages = message.text.replace(
      /<img[^>]*>|<br\s*\/?>/g,
      ""
    );

    navigator.clipboard.writeText(stringWithoutImages);

    setTooltip("Copied");
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    let container = document.getElementById("container");
    const updateContainerHeight = () =>
      isMobile ? (container.style.height = `${window.innerHeight}px`) : "100vh";

    updateContainerHeight();

    window.addEventListener("resize", updateContainerHeight);
    return () => {
      window.addEventListener("resize", updateContainerHeight);
    };
  }, [isMobile]);

  const handleValChange = (e) => {
    setRecognisedQuestion(e.target.value);
  };

  const outsideClickRef = useRef(null);

  // useEffect(() => {
  //   const clickOutside = (e) => {
  //     if (
  //       outsideClickRef.current &&
  //       !outsideClickRef.current.contains(e.target)
  //     ) {
  //       setDisplaySelectedValue(false);
  //     }
  //   };

  //   document.addEventListener("mousedown", clickOutside);
  //   return () => {
  //     document.addEventListener("mousedown", clickOutside);
  //   };
  // }, [setDisplaySelectedValue]);

  return (
    <div id="container" className={style.container}>
      <div
        id="sidepanel"
        className={`${style.sidepanel} ${isSidebarVisible ? "" : style.hidden}`}
        style={{
          width: isSidebarVisible ? "360px" : "0px",
          position: isMobile ? "absolute" : "unset",
        }}
      >
        <Sidebar onSelectChat={handleSelectChat} onNewChat={handleNewChat} />
      </div>

      <div>
        <button
          id="toggleButton"
          className={style.toggle}
          onClick={handleToggle}
        >
          <img src={isSidebarVisible ? xIcon : toggleBar} alt="Toggle Icon" />
        </button>
        <img
          src={logo}
          style={{
            top: !isSidebarVisible && (isMidWidth || isLargeWidth) && "0",
            left:
              !isSidebarVisible && isMidWidth
                ? "75%"
                : !isSidebarVisible && isLargeWidth
                ? "85%"
                : "",
          }}
          alt="Company Logo"
          className={style.logo}
        />
      </div>

      <div
        className={style.mainSection}
        style={{
          width: isSidebarVisible ? "revert-layer" : "100%",
        }}
      >
        <div
          className={style.mainPadding}
          style={{ paddingTop: !isSidebarVisible && isLargeWidth && "70px" }}
        >
          <div
            id="chat-messages"
            className={style.scrollingDiv}
            ref={chatMessagesRef}
          >
            {chatLoading ? (
              <div className={style.loaderContainerMain}>
                <Spinner
                  animation="border"
                  size="lg"
                  variant="light"
                  style={{
                    width: "100px",
                    height: "100px",
                    borderWidth: "5px",
                  }}
                />
              </div>
            ) : (
              <div
                className={style.chatDiv}
                style={{
                  padding: isSidebarVisible && "0 20px",
                  width:
                    isSidebarVisible && isMidWidth
                      ? "auto"
                      : !isSidebarVisible && isMidWidth
                      ? "100%"
                      : isSidebarVisible && isLargeWidth
                      ? "auto"
                      : !isSidebarVisible && isLargeWidth
                      ? "1000px"
                      : !isSidebarVisible && isMobile
                      ? "100%"
                      : !isSidebarVisible && isTablet
                      ? "100%"
                      : isSidebarVisible && isTablet
                      ? "auto"
                      : "1000px",
                }}
              >
                {messages?.map((message) => (
                  <div
                    key={message?.id}
                    className={`message ${message?.sender}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      marginLeft:
                        !isMobile && message?.sender !== "user"
                          ? "45px"
                          : isMobile && message?.sender !== "user"
                          ? "45px"
                          : "auto",
                      marginRight:
                        message.sender === "user"
                          ? ""
                          : message.type == "chart"
                          ? ""
                          : "auto",
                      wordBreak: "normal",
                      whiteSpace: "normal",
                      padding: "12px 16px",
                      borderRadius: "10px",
                      gap: "20px",
                      alignItems: "start",
                      background:
                        message.sender === "user" ? "#4C4C4C" : "#252525",
                      backdropFilter: "blur(12px)",
                      color: "#fff",
                      marginBottom: "25px",
                      marginTop:
                        isMobile && message.sender === "bot" ? "18px" : "0",
                    }}
                  >
                    {message?.type == "image" && (
                      <>
                        {imageUrl && (
                          <div className={style.imageContainer}>
                            <img
                              src={imageUrl}
                              alt="Generated"
                              className={style.generatedImage}
                            />
                          </div>
                        )}
                      </>
                    )}
                    {message?.type == "chart" ? (
                      <>
                        {/* <ChartComponent
                        showChart={true}
                        chartData={message?.text}
                      /> */}

                        <img
                          src={message?.text}
                          alt="graph_img"
                          width={"100%"}
                        />
                      </>
                    ) : (
                      <MarkdownPreview
                        // source={message?.text}
                        source={message?.text}
                        style={{
                          backgroundColor: "transparent",
                          color: "#fff",
                        }}
                      />
                    )}

                    {message?.sender === "bot" && (
                      <>
                        <img
                          src={authorIcon}
                          alt="Mashreq"
                          title="Mashreq"
                          width={"35px"}
                          className={style.companyLogo}
                        />
                        {message?.type != "chart" && (
                          <div className={style.copyButtonDiv}>
                            <button
                              className={style.regenerateButton}
                              onClick={() => regenerateMessage(message?.text)}
                            >
                              <img src={regenerateIcon} alt="" />
                              <span>Regenerate</span>
                            </button>
                            <div
                              className={style.copyButton}
                              onClick={() => handleCopyMessage(message)}
                              onMouseLeave={() => setTooltip("Copy")}
                            >
                              <img src={copyIcon} alt="" />
                              <span>{tooltip}</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
                {loading && (
                  <div
                    className={`message bot`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      marginLeft: "",
                      marginRight: "auto",
                      lineHeight: "32px",
                      wordBreak: "normal",
                      whiteSpace: "normal",
                      padding: "0",
                      borderRadius: "10px",
                      gap: "20px",
                      alignItems: "start",
                      color: "#fff",
                      marginBottom: "25px",
                      marginTop: "18px",
                    }}
                  >
                    <div className={style.loaderContainer}>
                      <Loader />
                      <img
                        src={authorIcon}
                        alt="Mashreq"
                        title="Mashreq"
                        width={"35px"}
                        className={style.loaderLogo}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div
          className={style.searchBarContainer}
          style={{
            padding:
              isSidebarVisible && isMobile
                ? "15px"
                : isSidebarVisible
                ? "0 20px 60px 20px"
                : "",
          }}
        >
          <form
            className={style.searchBar}
            onSubmit={(e) => {
              handleSendMessageV2(e);
            }}
          >
            <button
              type="button"
              onClick={openUpdateModal}
              disabled={loading ? true : false}
              className={
                loading
                  ? `${style.disabledBtn} ${style.attachIcon}`
                  : style.attachIcon
              }
            >
              <img src={attachIcon} alt="Attach Icon" />
            </button>
            <input
              type="text"
              id="question"
              autoComplete="off"
              placeholder="Type your question..."
              // value={combinedQuestion}
              // value={question}
              value={`${recognisedQuestion}${recognisingQuestion}`}
              // onChange={(e) => setQuestion(e.target.value)}
              onChange={handleValChange}
            />

            {/* <button
              type="button"
              onClick={openMicModal}
              disabled={loading ? true : false}
              className={
                loading
                  ? `${style.disabledBtn} ${style.micIcon}`
                  : style.micIcon
              }
            >
              <img src={micIcon} alt="Mic Icon" />
            </button> */}

            <div className={isRecognising ? style.wrapperMic : ""}>
              <div className={isRecognising ? style.iconwrapperMic : ""}>
                <button
                  onClick={() => (!isRecognising ? recorderV3() : null)}
                  type="button"
                  className={
                    loading
                      ? `${style.disabledBtn} ${style.micIcon}`
                      : style.micIcon
                  }
                >
                  <img src={micIcon} alt="Mic Icon" />
                </button>
              </div>
            </div>
            <div className={style.customSelect}>
              <div
                className={style.selectedOption}
                style={{ color: "white" }}
                onClick={() => setDisplaySelectedValue(!displaySelectedValue)}
              >
                {isMobile ? (
                  <img
                    src={
                      options.find((opt) => opt.value === selectedValue).icon
                    }
                    alt={`${selectedValue} icon`}
                  />
                ) : (
                  selectedValue
                )}
                <img
                  src={angleUpIcon}
                  alt=""
                  style={{
                    transform: displaySelectedValue ? "rotate(180deg)" : "",
                    transition: "transform 0.1s ease-in-out",
                  }}
                />
              </div>
              {displaySelectedValue && (
                <div ref={outsideClickRef} className={style.optionsList}>
                  {options.map((option) => (
                    <div
                      key={option.value}
                      className={style.option}
                      onClick={() => handleSelect(option.value)}
                      style={{ color: "white" }}
                    >
                      <img src={option.icon} alt={`${option.label} icon`} />
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading ? true : false}
              className={
                loading
                  ? `${style.disabledBtn} ${style.sendIcon}`
                  : style.sendIcon
              }
            >
              <img src={sendIcon} alt="Send Icon" />
            </button>

            {/* <Modal
              centered
              show={showModal}
              onHide={closeMicModal}
              className={style.modal}
              style={{
                width: isMobile ? "95%" : "100%",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <Modal.Header
                style={{
                  background: "#252525",
                  color: "#fff",
                  borderRadius: "0",
                }}
              >
                <Modal.Title>Say Anything</Modal.Title>
              </Modal.Header>
              <Modal.Body className={style.modalBodyWrapper}>
                <div className={style.modalBody}>
                  {transcriptLoading ? (
                    <button className={style.audioBtnLoading}>
                      <>
                        <Spinner
                          animation="border"
                          size="lg"
                          style={{
                            width: "100px",
                            height: "100px",
                            borderWidth: "5px",
                          }}
                        />
                      </>
                    </button>
                  ) : (
                    <>
                      <div className={style.wrapperMic}>
                        <div className={style.iconwrapperMic}>
                          <img src={bigMicIcon} alt="Toggle Icon" />
                        </div>
                      </div>
                      <p>Ask anything to search...</p>
                    </>
                  )}
                </div>
              </Modal.Body>
            </Modal> */}

            <Modal
              centered
              show={uploadModal}
              onHide={closeUpdateModal}
              className={style.modal}
              style={{
                width: isMobile ? "95%" : "100%",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                backgroundColor: "transparent",
              }}
            >
              <Modal.Header
                style={{
                  background: "#252525",
                  color: "#fff",
                  borderRadius: "0",
                }}
              >
                <Modal.Title>Upload PDF File</Modal.Title>
              </Modal.Header>
              <Modal.Body className={style.modalBodyWrapper} gap={0}>
                <div className={style.modalBody}>
                  {uploadLoading ? (
                    <>
                      <Spinner
                        animation="border"
                        size="lg"
                        style={{
                          width: "100px",
                          height: "100px",
                          borderWidth: "5px",
                        }}
                      />
                      <p>Uploading...</p>
                    </>
                  ) : (
                    <>
                      <img
                        src={uploadFile}
                        alt="Toggle Icon"
                        width={140}
                        onClick={handleImageClick}
                        className={style.uploadInp}
                      />
                      <p>Browse Files</p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={handleUploadFile}
                        id="file"
                        accept="application/pdf"
                      />
                    </>
                  )}
                </div>
              </Modal.Body>
            </Modal>
          </form>
        </div>
      </div>
    </div>
  );
}
