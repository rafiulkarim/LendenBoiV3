import axios from 'axios'
import { SMS_SEND_URL, SMS_STATUS_URL } from '../../env'

export const SmsStatus = async () => {
  try {
    const response = await axios.get(SMS_STATUS_URL)
    console.log(response.data.balance)
    return response.data.balance   // 👈 return data
  } catch (error) {
    console.log(error)
    throw error
  }
}

export const SendBulkSMS = async (phoneNumber, smsContent) => {
  try {
    const response = await axios.get(`http://bulksmsbd.net/api/smsapi?api_key=1nWtRTLWI95Wufjyp07F&type=text&number=${phoneNumber}&senderid=8809648906447&message=${smsContent}`)
    console.log(response.data)
    return response.data
  } catch (error) {
    console.log('SMS Error:', error)
    throw error
  }
}