export const extractLables = (response) => {
  const regex = /const\s+labels\s*=\s*(\[[^\]]*\])/;
  const match = response.match(regex);
  let arrayString = match[1];
  arrayString = arrayString.replace(/'/g, '"');
  const array = JSON.parse(arrayString);
  return array;
};

export const extractData = async (response) => {
  try {
    const regex = /const\s+data\s*=\s*({[\s\S]*?});/;
    const match = response.match(regex);
    const matchedStr = match[0];
    const str1 = matchedStr.replace(/\n/g, "");
    const str2 = str1.replace(/\s+/g, "");
    const finalStr = str2.replace("constdata=", "");
    const str5 = finalStr.replace(";", "");
    let correctedString = addQuotes(str5);
    correctedString = correctedString.replace(/'s/g, '');
    correctedString = correctedString.replace(/'/g, '"');
    const fnlStr = await JSON.parse(correctedString);
    return fnlStr;  
  } catch (error) {
    // throw new Error("Unable to parse chart");
     return false; 
  }
  
};

function addQuotes(jsonString) {
  jsonString = jsonString.replace(
    /([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g,
    '$1"$2"$3'
  );

  jsonString = jsonString.replace(/:\s*'([^']*)'/g, ': "$1"');

  return jsonString;
}

// export default {
//   extractLables,
//   extractData,
// };
