import React from 'react';
import {
  FiHome, FiSearch, FiMapPin, FiClock, FiUser, FiShield, FiBell, FiMessageCircle, FiList, FiSettings,
  FiLogOut, FiEdit2, FiKey, FiLock, FiCreditCard, FiMail, FiPhone, FiAlertTriangle, FiFlag, FiInfo,
  FiStar, FiBarChart2, FiMap, FiCheckCircle, FiXCircle, FiMoon, FiUsers, FiLink, FiShare2, FiCpu,
  FiCamera, FiSmartphone, FiRepeat, FiEye, FiEyeOff, FiCrosshair, FiTrash2, FiCalendar, FiDollarSign,
  FiHelpCircle, FiFileText, FiZap, FiGift, FiHeart, FiThumbsUp, FiNavigation, FiUserCheck, FiX, FiCheck,
} from 'react-icons/fi';
import {
  MdOutlineTwoWheeler, MdOutlineDirectionsCar, MdOutlineEventSeat, MdOutlineSchool, MdOutlineEco,
  MdOutlineLocalGasStation, MdOutlineWoman, MdOutlineBackpack, MdOutlinePayments, MdOutlineToll,
} from 'react-icons/md';

// One line-icon set for the whole app. Older code used emoji as icons; <Icon e="📍" /> draws the
// matching line icon instead, and <Icon name="pin" /> picks one by name.
const BY_EMOJI = {
  '🏠': FiHome, '🔍': FiSearch, '🔎': FiSearch, '📍': FiMapPin, '📌': FiMapPin,
  '🕐': FiClock, '🕘': FiClock, '🕒': FiClock, '⏰': FiClock, '⏳': FiClock, '⌛': FiClock,
  '👤': FiUser, '🙋': FiUser, '🧑': FiUser, '👨': FiUser, '👩': FiUser, '🛡️': FiShield, '🛡': FiShield,
  '🔔': FiBell, '💬': FiMessageCircle, '📋': FiList, '🧾': FiList, '⚙️': FiSettings, '⚙': FiSettings,
  '🚪': FiLogOut, '✏️': FiEdit2, '✏': FiEdit2, '🔐': FiLock, '🔑': FiKey, '🔒': FiLock,
  '💳': FiCreditCard, '🆔': FiCreditCard, '📧': FiMail, '✉️': FiMail, '📞': FiPhone, '📱': FiSmartphone,
  '🆘': FiAlertTriangle, '⚠️': FiAlertTriangle, '⚠': FiAlertTriangle, '🚩': FiFlag, '🏁': FiFlag,
  '💡': FiInfo, 'ℹ️': FiInfo, '⭐': FiStar, '🌟': FiStar, '📊': FiBarChart2, '📈': FiBarChart2, '🗺️': FiMap, '🗺': FiMap,
  '✅': FiCheckCircle, '☑️': FiCheckCircle, '🎉': FiCheckCircle, '❌': FiXCircle, '🌙': FiMoon,
  '👨‍👩‍👧': FiUsers, '👪': FiUsers, '🤝': FiUsers, '👥': FiUsers, '🔗': FiLink, '📤': FiShare2,
  '🤖': FiCpu, '📸': FiCamera, '📷': FiCamera, '🔄': FiRepeat, '🔁': FiRepeat, '👀': FiEye, '👁️': FiEye, '🙈': FiEyeOff,
  '🎯': FiCrosshair, '🗑️': FiTrash2, '📅': FiCalendar, '📆': FiCalendar, '💸': FiDollarSign,
  '❓': FiHelpCircle, '📄': FiFileText, '📝': FiFileText, '📜': FiFileText, '⚡': FiZap, '🎁': FiGift, '❤️': FiHeart,
  '👍': FiThumbsUp, '🚫': FiXCircle, '📢': FiBell, '🧭': FiNavigation, '🚀': FiNavigation, '🪪': FiUserCheck, '✕': FiX, '✓': FiCheck,
  '🏍️': MdOutlineTwoWheeler, '🏍': MdOutlineTwoWheeler, '🛵': MdOutlineTwoWheeler, '🚲': MdOutlineTwoWheeler,
  '🚗': MdOutlineDirectionsCar, '🚘': MdOutlineDirectionsCar, '🚙': MdOutlineDirectionsCar, '🚕': MdOutlineDirectionsCar,
  '💺': MdOutlineEventSeat, '🎓': MdOutlineSchool, '🏫': MdOutlineSchool, '🌱': MdOutlineEco, '🌿': MdOutlineEco,
  '⛽': MdOutlineLocalGasStation, '🚺': MdOutlineWoman, '🎒': MdOutlineBackpack,
  '💵': MdOutlinePayments, '💰': MdOutlinePayments, '🪙': MdOutlineToll,
};

const BY_NAME = {
  home: FiHome, search: FiSearch, pin: FiMapPin, clock: FiClock, user: FiUser, shield: FiShield, bell: FiBell,
  chat: FiMessageCircle, list: FiList, settings: FiSettings, card: FiCreditCard, mail: FiMail, phone: FiPhone,
  alert: FiAlertTriangle, flag: FiFlag, info: FiInfo, star: FiStar, map: FiMap, check: FiCheckCircle,
  users: FiUsers, link: FiLink, share: FiShare2, bike: MdOutlineTwoWheeler, car: MdOutlineDirectionsCar,
  seat: MdOutlineEventSeat, school: MdOutlineSchool, eco: MdOutlineEco, fuel: MdOutlineLocalGasStation,
  woman: MdOutlineWoman, cash: MdOutlinePayments, calendar: FiCalendar, lock: FiLock, key: FiKey, edit: FiEdit2,
  logout: FiLogOut, camera: FiCamera, x: FiX,
};

export const VEHICLE_ICON = { BIKE: MdOutlineTwoWheeler, SCOOTY: MdOutlineTwoWheeler, CAR: MdOutlineDirectionsCar };

const DOTS = { '🟠': 'bg-black', '🟢': 'bg-aviro-green', '🔴': 'bg-red-600', '🟡': 'bg-yellow-500', '⚪': 'bg-neutral-300' };

export default function Icon({ e, name, size = '1.15em', className = '', ...rest }) {
  if (DOTS[e]) return <span className={`inline-block w-2.5 h-2.5 rounded-full ${DOTS[e]} ${className}`} aria-hidden="true" />;
  const Cmp = name ? BY_NAME[name] : BY_EMOJI[e] || BY_EMOJI[(e || '').replace(/️/g, '')];
  if (!Cmp) return e ? <span className={className}>{e}</span> : null;
  return <Cmp size={size} className={`inline-block align-[-0.15em] flex-shrink-0 ${className}`} aria-hidden="true" {...rest} />;
}

// Text from the server can carry emoji ("Booking Confirmed! ✅"); the icon already says it
export const stripEmoji = (text) => (text || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{FE0F}\u{200D}]/gu, '').replace(/\s{2,}/g, ' ').trim();

// First letter of a name, for round avatars
export const initial = (name) => (name || '?').trim().charAt(0).toUpperCase() || '?';
