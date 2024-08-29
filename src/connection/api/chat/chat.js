import { baseURL, baseUploadURL } from "../../config/url";
import axios from "axios";

export const uploadFileAPI = async (payload) => {
  try {
    return new Promise((resolve, reject) => {
      axios
        .post(`${baseUploadURL}`, payload, {
          headers: {
            accept: "application/json",
            "Content-Type": `multipart/form-data`,
          },
        })
        .then((res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err || "Oops some error occured!");
        });
    });
  } catch (error) {
    throw new Error(error || "Oops some error occured!");
  }
};

export const uploadAudioAPI = async (payload) => {
  try {
    return new Promise((resolve, reject) => {
      axios
        .post(`${baseURL}transcribe-audio`, payload, {
          headers: {
            accept: "application/json",
            "Content-Type": `multipart/form-data`,
          },
        })
        .then((res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err || "Oops some error occured!");
        });
    });
  } catch (error) {
    throw new Error(error || "Oops some error occured!");
  }
};
