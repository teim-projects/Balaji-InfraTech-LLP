import React, { useState, useEffect } from "react";
import { Upload, ArrowLeft, User, CreditCard, Briefcase, Calculator, Pencil, Trash2, Image as ImageIcon, FileText } from "lucide-react";
import Swal from "sweetalert2";
import ImageCropModal from "./ImageCropModal";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

export const CATEGORY_PRESETS = {
  "Unskilled": {
    basic: "12519.00",
    hra: "625.95",
    cca_site_allowance: "0.00",
    bonus: "1043.00",
    leave_encashment: "602.00",
    transport: "1500.00",
    uniform_shoes: "300.00",
  },
  "Semi-Skilled": {
    basic: "13879.00",
    hra: "693.95",
    cca_site_allowance: "0.00",
    bonus: "1156.00",
    leave_encashment: "668.00",
    transport: "1500.00",
    uniform_shoes: "300.00",
  },
  "Skilled": {
    basic: "15239.00",
    hra: "761.95",
    cca_site_allowance: "0.00",
    bonus: "1269.00",
    leave_encashment: "733.00",
    transport: "1500.00",
    uniform_shoes: "300.00",
  },
  "Diploma (Skilled-1)": {
    basic: "15239.00",
    hra: "761.95",
    cca_site_allowance: "500.00",
    bonus: "1269.00",
    leave_encashment: "733.00",
    transport: "1500.00",
    uniform_shoes: "300.00",
  },
  "Shift Supervisors (Skilled)": {
    basic: "15239.00",
    hra: "761.95",
    cca_site_allowance: "1000.00",
    bonus: "1269.00",
    leave_encashment: "733.00",
    transport: "1500.00",
    uniform_shoes: "300.00",
  },
  "Hydra Driver (Skilled)": {
    basic: "15239.00",
    hra: "761.95",
    cca_site_allowance: "2000.00",
    bonus: "1269.00",
    leave_encashment: "733.00",
    transport: "1500.00",
    uniform_shoes: "300.00",
  },
  "Welder": {
    basic: "15239.00",
    hra: "761.95",
    cca_site_allowance: "0.00",
    bonus: "1269.00",
    leave_encashment: "733.00",
    transport: "1500.00",
    uniform_shoes: "300.00",
  },
};

export function getPresetForCategory(catStr) {
  if (!catStr) return null;
  const norm = String(catStr).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (norm.includes("unskilled")) return CATEGORY_PRESETS["Unskilled"];
  if (norm.includes("semiskilled") || norm.includes("12th")) return CATEGORY_PRESETS["Semi-Skilled"];
  if (norm.includes("diploma")) return CATEGORY_PRESETS["Diploma (Skilled-1)"];
  if (norm.includes("supervisor") || norm.includes("shiftsupervisor")) return CATEGORY_PRESETS["Shift Supervisors (Skilled)"];
  if (norm.includes("hydra")) return CATEGORY_PRESETS["Hydra Driver (Skilled)"];
  if (norm.includes("welder")) return CATEGORY_PRESETS["Welder"];
  if (norm.includes("skilled")) return CATEGORY_PRESETS["Skilled"];
  return null;
}

export default function RegisterEmployee({
  onBack,
  onSuccess,
  baseApi,
  token,
  initialData = null,
  hideBreadcrumb = false,
  customBreadcrumb = null,
}) {
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoFileName, setPhotoFileName] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [errors, setErrors] = useState({});

  // Document Files & Previews
  const [adharFile, setAdharFile] = useState(null);
  const [adharFileName, setAdharFileName] = useState("");
  const [adharPreview, setAdharPreview] = useState(null);

  const [panFile, setPanFile] = useState(null);
  const [panFileName, setPanFileName] = useState("");
  const [panPreview, setPanPreview] = useState(null);

  const [educationFile, setEducationFile] = useState(null);
  const [educationFileName, setEducationFileName] = useState("");
  const [educationPreview, setEducationPreview] = useState(null);

  const [experienceFile, setExperienceFile] = useState(null);
  const [experienceFileName, setExperienceFileName] = useState("");
  const [experiencePreview, setExperiencePreview] = useState(null);

  useEffect(() => {
    if (initialData?.photo) {
      const photoUrl = typeof initialData.photo === "string" ? initialData.photo : "";
      if (photoUrl) {
        const extractedName = photoUrl.split("/").pop() || "employee_photo.jpg";
        setPhotoFileName(extractedName);
        const fullUrl = photoUrl.startsWith("http")
          ? photoUrl
          : `${baseApi.replace(/\/$/, "")}${photoUrl.startsWith("/") ? "" : "/"}${photoUrl}`;
        setPhotoPreview(fullUrl);
        setRawImageSrc(fullUrl);
      }
    }

    if (initialData?.adhar_image) {
      const url = initialData.adhar_image.startsWith("http") ? initialData.adhar_image : `${baseApi.replace(/\/$/, "")}${initialData.adhar_image.startsWith("/") ? "" : "/"}${initialData.adhar_image}`;
      setAdharPreview(url);
      setAdharFileName(initialData.adhar_image.split("/").pop());
    }
    if (initialData?.pan_image) {
      const url = initialData.pan_image.startsWith("http") ? initialData.pan_image : `${baseApi.replace(/\/$/, "")}${initialData.pan_image.startsWith("/") ? "" : "/"}${initialData.pan_image}`;
      setPanPreview(url);
      setPanFileName(initialData.pan_image.split("/").pop());
    }
    if (initialData?.education_certificate) {
      const url = initialData.education_certificate.startsWith("http") ? initialData.education_certificate : `${baseApi.replace(/\/$/, "")}${initialData.education_certificate.startsWith("/") ? "" : "/"}${initialData.education_certificate}`;
      setEducationPreview(url);
      setEducationFileName(initialData.education_certificate.split("/").pop());
    }
    if (initialData?.experience_certificate) {
      const url = initialData.experience_certificate.startsWith("http") ? initialData.experience_certificate : `${baseApi.replace(/\/$/, "")}${initialData.experience_certificate.startsWith("/") ? "" : "/"}${initialData.experience_certificate}`;
      setExperiencePreview(url);
      setExperienceFileName(initialData.experience_certificate.split("/").pop());
    }

    if (initialData?.name) {
      const parts = initialData.name.split(" ").filter(Boolean);
      let first = "", middle = "", last = "";
      if (parts.length === 1) {
        first = parts[0];
      } else if (parts.length === 2) {
        first = parts[0];
        last = parts[1];
      } else if (parts.length >= 3) {
        first = parts[0];
        last = parts[parts.length - 1];
        middle = parts.slice(1, -1).join(" ");
      }
      const isUnregistered = Boolean(
        initialData?.is_unregistered || (!initialData?.id && (initialData?.name || initialData?.balaji_emp_code))
      );

      const rawBasic = parseFloat(initialData?.basic);
      const basicNum = (!isNaN(rawBasic) && rawBasic > 0) ? rawBasic : (isUnregistered ? 15525 : 0);
      const basicStr = (!isNaN(rawBasic) && rawBasic > 0) ? String(initialData.basic) : (isUnregistered ? "15525.00" : "");

      const existingHra = parseFloat(initialData?.hra);
      const resolvedHra = (!isNaN(existingHra) && existingHra > 0) ? String(initialData.hra) : (basicNum > 0 ? (basicNum * 0.05).toFixed(2) : "");

      const ccaVal = parseFloat(initialData?.cca_site_allowance) || 0;
      const attVal = parseFloat(initialData?.attendance_bonus) || 0;

      const existingBonus = parseFloat(initialData?.bonus);
      const resolvedBonus = (!isNaN(existingBonus) && existingBonus > 0) ? String(initialData.bonus) : (basicNum > 0 ? (basicNum * 0.0833).toFixed(2) : "");

      const existingLeave = parseFloat(initialData?.leave_encashment);
      const resolvedLeave = (!isNaN(existingLeave) && existingLeave > 0) ? String(initialData.leave_encashment) : (basicNum > 0 ? (basicNum * 0.05).toFixed(2) : "");

      const hraVal = parseFloat(resolvedHra) || 0;
      const bonusVal = parseFloat(resolvedBonus) || 0;
      const leaveVal = parseFloat(resolvedLeave) || 0;
      const sumGross = basicNum + hraVal + ccaVal + attVal + bonusVal + leaveVal;

      const existingGross = parseFloat(initialData?.gross_salary);
      const resolvedGross = (!isNaN(existingGross) && existingGross > 1.2) ? String(initialData.gross_salary) : (sumGross > 0 ? sumGross.toFixed(2) : "");

      const existingPf = parseFloat(initialData?.pf_13);
      const resolvedPf = (!isNaN(existingPf) && existingPf > 0) ? String(initialData.pf_13) : (basicNum > 0 ? (basicNum > 15000 ? 15000 * 0.13 : basicNum * 0.13).toFixed(2) : "");

      const existingTransport = parseFloat(initialData?.transport);
      const resolvedTransport = (!isNaN(existingTransport) && existingTransport > 0) ? String(initialData.transport) : (basicNum > 0 ? "1500.00" : "");

      const grossVal = parseFloat(resolvedGross) || sumGross;
      const existingEsic = parseFloat(initialData?.esic_3_25);
      const resolvedEsic = (!isNaN(existingEsic) && existingEsic > 0) ? String(initialData.esic_3_25) : (grossVal > 0 ? ((grossVal - bonusVal) * 0.0325).toFixed(2) : "");

      const existingUniform = parseFloat(initialData?.uniform_shoes);
      const resolvedUniform = (!isNaN(existingUniform) && existingUniform > 0) ? String(initialData.uniform_shoes) : (basicNum > 0 ? "300.00" : "");

      const existingServices = parseFloat(initialData?.services_7);
      const resolvedServices = (!isNaN(existingServices) && existingServices > 0) ? String(initialData.services_7) : (grossVal > 0 ? ((grossVal + parseFloat(resolvedTransport || 0) + parseFloat(resolvedEsic || 0) + parseFloat(resolvedUniform || 0)) * 0.07).toFixed(2) : "");

      const existingCtc = parseFloat(initialData?.ctc);
      const resolvedCtc = (!isNaN(existingCtc) && existingCtc > 0) ? String(initialData.ctc) : (grossVal > 0 ? (grossVal + parseFloat(resolvedTransport || 0) + parseFloat(resolvedPf || 0) + parseFloat(resolvedEsic || 0) + parseFloat(resolvedUniform || 0) + parseFloat(resolvedServices || 0)).toFixed(2) : "");

      setFormData(prev => ({
        ...prev,
        first_name: first,
        middle_name: middle,
        last_name: last,
        basic: basicStr,
        hra: resolvedHra,
        cca_site_allowance: initialData?.cca_site_allowance !== undefined ? String(initialData.cca_site_allowance) : "0.00",
        attendance_bonus: (initialData?.attendance_bonus && parseFloat(initialData.attendance_bonus) > 0) ? String(initialData.attendance_bonus) : "",
        bonus: resolvedBonus,
        leave_encashment: resolvedLeave,
        gross_salary: resolvedGross,
        balaji_emp_code: initialData?.balaji_emp_code || prev.balaji_emp_code || "",
        whatsapp_no: initialData?.whatsapp_no || prev.whatsapp_no || "",
        transport: resolvedTransport,
        pf_13: resolvedPf,
        esic_3_25: resolvedEsic,
        uniform_shoes: resolvedUniform,
        services_7: resolvedServices,
        ctc: resolvedCtc,
      }));
    }
  }, [initialData, baseApi]);

  const isUnregInitial = Boolean(
    initialData?.is_unregistered || (!initialData?.id && (initialData?.name || initialData?.balaji_emp_code))
  );

  const [formData, setFormData] = useState({
    balaji_emp_code: initialData?.balaji_emp_code || "",
    salutation: initialData?.salutation || "Mr.",
    first_name: "",
    middle_name: "",
    last_name: "",
    sex: initialData?.sex || "Male",
    dob: initialData?.dob || "",
    doj: initialData?.doj || "",
    adhar_no: initialData?.adhar_no || "",
    designation: initialData?.designation || "",
    department: initialData?.department || "",
    category: initialData?.category || "Skilled",
    account_no: initialData?.account_no || "",
    uan_no: initialData?.uan_no || "",
    mobile_no: initialData?.mobile_no || "",
    whatsapp_no: initialData?.whatsapp_no || "",
    email: initialData?.email || "",
    father_or_husband_name: initialData?.father_or_husband_name || "",
    qualification: initialData?.qualification || "",
    emergency_contact_no: initialData?.emergency_contact_no || "",
    identity_mark: initialData?.identity_mark || "",
    pan_number: initialData?.pan_number ? String(initialData.pan_number).toUpperCase() : "",
    marital_status: initialData?.marital_status || "Not Married",
    current_address_line1: initialData?.current_address_line1 || "",
    current_address_line2: initialData?.current_address_line2 || "",
    current_address_state: initialData?.current_address_state || "",
    current_address_city: initialData?.current_address_city || "",
    current_address_pincode: initialData?.current_address_pincode || "",
    permanent_address_line1: initialData?.permanent_address_line1 || "",
    permanent_address_line2: initialData?.permanent_address_line2 || "",
    permanent_address_state: initialData?.permanent_address_state || "",
    permanent_address_city: initialData?.permanent_address_city || "",
    permanent_address_pincode: initialData?.permanent_address_pincode || "",
    is_permanent_same_as_current: initialData?.is_permanent_same_as_current || false,
    bank_name: initialData?.bank_name || "",
    ifsc_code: initialData?.ifsc_code || "",
    esic_no: initialData?.esic_no || "",
    nominee_name: initialData?.nominee_name || "",
    calculation_days: initialData?.calculation_days || 30,
    basic: (() => {
      const b = parseFloat(initialData?.basic);
      if (!isNaN(b) && b > 0) return String(initialData.basic);
      return isUnregInitial ? "15525.00" : "";
    })(),
    hra: (() => {
      const h = parseFloat(initialData?.hra);
      if (!isNaN(h) && h > 0) return String(initialData.hra);
      const b = parseFloat(initialData?.basic);
      if (!isNaN(b) && b > 0) return (b * 0.05).toFixed(2);
      return isUnregInitial ? (15525 * 0.05).toFixed(2) : "";
    })(),
    cca_site_allowance: initialData?.cca_site_allowance !== undefined ? String(initialData.cca_site_allowance) : "0.00",
    attendance_bonus: (initialData?.attendance_bonus && parseFloat(initialData.attendance_bonus) > 0) ? String(initialData.attendance_bonus) : "",
    bonus: (() => {
      const b = parseFloat(initialData?.bonus);
      if (!isNaN(b) && b > 0) return String(initialData.bonus);
      const rawB = parseFloat(initialData?.basic);
      if (!isNaN(rawB) && rawB > 0) return (rawB * 0.0833).toFixed(2);
      return isUnregInitial ? (15525 * 0.0833).toFixed(2) : "";
    })(),
    leave_encashment: (() => {
      const le = parseFloat(initialData?.leave_encashment);
      if (!isNaN(le) && le > 0) return String(initialData.leave_encashment);
      const rawB = parseFloat(initialData?.basic);
      if (!isNaN(rawB) && rawB > 0) return (rawB * 0.05).toFixed(2);
      return isUnregInitial ? (15525 * 0.05).toFixed(2) : "";
    })(),
    gross_salary: (() => {
      const g = parseFloat(initialData?.gross_salary);
      if (g && g > 1.2) return String(initialData.gross_salary);
      const rawB = parseFloat(initialData?.basic);
      if (!isNaN(rawB) && rawB > 0) {
        const basicVal = rawB;
        const h = parseFloat(initialData?.hra) || (basicVal * 0.05);
        const cca = parseFloat(initialData?.cca_site_allowance) || 0;
        const att = parseFloat(initialData?.attendance_bonus) || 0;
        const bon = parseFloat(initialData?.bonus) || (basicVal * 0.0833);
        const le = parseFloat(initialData?.leave_encashment) || (basicVal * 0.05);
        return (basicVal + h + cca + att + bon + le).toFixed(2);
      }
      return isUnregInitial ? "18371.00" : "";
    })(),
    transport: (() => {
      const t = parseFloat(initialData?.transport);
      if (!isNaN(t) && t > 0) return String(initialData.transport);
      return isUnregInitial ? "1500.00" : "";
    })(),
    pf_13: (() => {
      const p = parseFloat(initialData?.pf_13);
      if (!isNaN(p) && p > 0) return String(initialData.pf_13);
      const rawB = parseFloat(initialData?.basic);
      if (!isNaN(rawB) && rawB > 0) {
        return (rawB > 15000 ? 15000 * 0.13 : rawB * 0.13).toFixed(2);
      }
      return isUnregInitial ? "1950.00" : "";
    })(),
    esic_3_25: (() => {
      const e = parseFloat(initialData?.esic_3_25);
      if (!isNaN(e) && e > 0) return String(initialData.esic_3_25);
      const rawB = parseFloat(initialData?.basic);
      if (!isNaN(rawB) && rawB > 0) {
        const basicVal = rawB;
        const bon = parseFloat(initialData?.bonus) || (basicVal * 0.0833);
        const h = parseFloat(initialData?.hra) || (basicVal * 0.05);
        const cca = parseFloat(initialData?.cca_site_allowance) || 0;
        const att = parseFloat(initialData?.attendance_bonus) || 0;
        const le = parseFloat(initialData?.leave_encashment) || (basicVal * 0.05);
        const gross = parseFloat(initialData?.gross_salary) || (basicVal + h + cca + att + bon + le);
        return ((gross - bon) * 0.0325).toFixed(2);
      }
      return isUnregInitial ? "555.00" : "";
    })(),
    uniform_shoes: (() => {
      const u = parseFloat(initialData?.uniform_shoes);
      if (!isNaN(u) && u > 0) return String(initialData.uniform_shoes);
      return isUnregInitial ? "300.00" : "";
    })(),
    services_7: (() => {
      const s = parseFloat(initialData?.services_7);
      if (!isNaN(s) && s > 0) return String(initialData.services_7);
      const rawB = parseFloat(initialData?.basic);
      if (!isNaN(rawB) && rawB > 0) {
        const basicVal = rawB;
        const bon = parseFloat(initialData?.bonus) || (basicVal * 0.0833);
        const h = parseFloat(initialData?.hra) || (basicVal * 0.05);
        const cca = parseFloat(initialData?.cca_site_allowance) || 0;
        const att = parseFloat(initialData?.attendance_bonus) || 0;
        const le = parseFloat(initialData?.leave_encashment) || (basicVal * 0.05);
        const gross = parseFloat(initialData?.gross_salary) || (basicVal + h + cca + att + bon + le);
        const trans = parseFloat(initialData?.transport) || 1500;
        const esic = parseFloat(initialData?.esic_3_25) || ((gross - bon) * 0.0325);
        const uni = parseFloat(initialData?.uniform_shoes) || 300;
        return ((gross + trans + esic + uni) * 0.07).toFixed(2);
      }
      return isUnregInitial ? "1482.00" : "";
    })(),
    ctc: (() => {
      const c = parseFloat(initialData?.ctc);
      if (!isNaN(c) && c > 0) return String(initialData.ctc);
      const rawB = parseFloat(initialData?.basic);
      if (!isNaN(rawB) && rawB > 0) {
        const basicVal = rawB;
        const bon = parseFloat(initialData?.bonus) || (basicVal * 0.0833);
        const h = parseFloat(initialData?.hra) || (basicVal * 0.05);
        const cca = parseFloat(initialData?.cca_site_allowance) || 0;
        const att = parseFloat(initialData?.attendance_bonus) || 0;
        const le = parseFloat(initialData?.leave_encashment) || (basicVal * 0.05);
        const gross = parseFloat(initialData?.gross_salary) || (basicVal + h + cca + att + bon + le);
        const trans = parseFloat(initialData?.transport) || 1500;
        const pf = parseFloat(initialData?.pf_13) || (basicVal > 15000 ? 15000 * 0.13 : basicVal * 0.13);
        const esic = parseFloat(initialData?.esic_3_25) || ((gross - bon) * 0.0325);
        const uni = parseFloat(initialData?.uniform_shoes) || 300;
        const serv = parseFloat(initialData?.services_7) || ((gross + trans + esic + uni) * 0.07);
        return (gross + trans + pf + esic + uni + serv).toFixed(2);
      }
      return isUnregInitial ? "24158.00" : "";
    })(),
    per_day_ctc: initialData?.per_day_ctc ? String(initialData.per_day_ctc) : (isUnregInitial ? "894.74" : "0.00"),
    site_allowance_paid_rate: initialData?.site_allowance_paid_rate ? String(initialData.site_allowance_paid_rate) : (isUnregInitial ? "75.47" : "0.00"),
    site_allowance_billing_rate: initialData?.site_allowance_billing_rate ? String(initialData.site_allowance_billing_rate) : (isUnregInitial ? "83.38" : "0.00"),
  });

  const formatIfscCode = (inputVal) => {
    if (!inputVal) return "";
    const clean = inputVal.replace(/[^a-zA-Z0-9]/g, "");
    const lettersPart = clean.slice(0, 4).replace(/[^a-zA-Z]/g, "").toUpperCase();
    const digitsPart = clean.slice(4).replace(/[^0-9]/g, "").slice(0, 7);
    return (lettersPart + digitsPart).slice(0, 11);
  };

  const formatAdharCode = (inputVal) => {
    if (!inputVal) return "";
    const clean = inputVal.replace(/[^0-9]/g, "").slice(0, 12);
    const parts = [];
    for (let i = 0; i < clean.length; i += 4) {
      parts.push(clean.slice(i, i + 4));
    }
    return parts.join("-");
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === "checkbox" ? checked : value;

    if (name === "ifsc_code") {
      finalValue = formatIfscCode(value);
    } else if (name === "adhar_no") {
      finalValue = formatAdharCode(value);
    } else if (name === "account_no") {
      finalValue = value.replace(/[^0-9]/g, "");
    } else if (name === "pan_number") {
      finalValue = value.toUpperCase();
    }

    if (name === "is_permanent_same_as_current") {
      if (checked) {
        setFormData((prev) => ({
          ...prev,
          is_permanent_same_as_current: true,
          permanent_address_line1: prev.current_address_line1,
          permanent_address_line2: prev.current_address_line2,
          permanent_address_state: prev.current_address_state,
          permanent_address_city: prev.current_address_city,
          permanent_address_pincode: prev.current_address_pincode,
        }));
      } else {
        setFormData((prev) => ({ ...prev, is_permanent_same_as_current: false }));
      }
      return;
    }

    if (name === "category") {
      const preset = getPresetForCategory(finalValue);
      setFormData((prev) => {
        const nextState = { ...prev, category: finalValue };
        if (preset) {
          const newBasic = preset.basic;
          const newHra = preset.hra || (parseFloat(newBasic) * 0.05).toFixed(2);
          const newCca = preset.cca_site_allowance || "0.00";
          const newBonus = preset.bonus || (parseFloat(newBasic) * 0.0833).toFixed(2);
          const newLeave = preset.leave_encashment || (parseFloat(newBasic) * 0.05).toFixed(2);
          const newTransport = preset.transport || "1500.00";
          const newUniform = preset.uniform_shoes || "300.00";
          const basicNum = parseFloat(newBasic) || 0;
          const newPf = preset.pf_13 || (basicNum > 15000 ? 15000 * 0.13 : basicNum * 0.13).toFixed(2);

          // Dynamic calculation of Gross Salary as per PDF Annexure C Row A: Basic + HRA + CCA + Attendance Bonus + Bonus
          const bVal = parseFloat(newBasic) || 0;
          const hVal = parseFloat(newHra) || 0;
          const cVal = parseFloat(newCca) || 0;
          const aVal = parseFloat(prev.attendance_bonus) || 0;
          const bonVal = parseFloat(newBonus) || 0;
          const grossSum = bVal + hVal + cVal + aVal + bonVal;
          const autoGross = grossSum > 0 ? Math.round(grossSum).toFixed(2) : "0.00";

          // Dynamic calculation of ESIC, Services Charges, CTC & Per Day CTC
          const grossNum = parseFloat(autoGross) || 0;
          const transNum = parseFloat(newTransport) || (grossNum > 0 ? 1500 : 0);
          const pfNum = parseFloat(newPf) || 0;
          const esicNum = grossNum > 0 ? parseFloat(((grossNum - bonVal) * 0.0325).toFixed(2)) : 0;
          const uniNum = parseFloat(newUniform) || (grossNum > 0 ? 300 : 0);
          const servNum = grossNum > 0 ? parseFloat(((grossNum + transNum + esicNum + uniNum) * 0.07).toFixed(2)) : 0;
          const calculatedCtc = grossNum > 0 ? (grossNum + transNum + pfNum + esicNum + uniNum + servNum).toFixed(2) : "0.00";
          const calcDays = parseFloat(prev.calculation_days) || 30;

          return {
            ...nextState,
            basic: newBasic,
            hra: newHra,
            cca_site_allowance: newCca,
            bonus: newBonus,
            leave_encashment: newLeave,
            gross_salary: autoGross,
            transport: newTransport,
            pf_13: newPf,
            esic_3_25: esicNum > 0 ? esicNum.toFixed(2) : "0.00",
            uniform_shoes: newUniform,
            services_7: servNum > 0 ? servNum.toFixed(2) : "0.00",
            ctc: calculatedCtc,
            per_day_ctc: calcDays > 0 ? (parseFloat(calculatedCtc) / calcDays).toFixed(2) : "0.00",
          };
        }
        return nextState;
      });
      return;
    }

    if (["basic", "hra", "cca_site_allowance", "attendance_bonus", "bonus", "leave_encashment", "transport", "pf_13", "uniform_shoes", "ctc"].includes(name)) {
      setFormData((prev) => {
        let newBasic = prev.basic;
        let newHra = prev.hra;
        let newBonus = prev.bonus;
        let newLeave = prev.leave_encashment;
        let newCca = prev.cca_site_allowance;
        let newAttBonus = prev.attendance_bonus;
        let newPf = prev.pf_13;
        let newTransport = prev.transport;
        let newUniform = prev.uniform_shoes;
        let newCtc = prev.ctc;

        if (name === "basic") {
          newBasic = finalValue;
          const basicNum = parseFloat(finalValue);
          if (!isNaN(basicNum) && basicNum > 0) {
            newHra = (basicNum * 0.05).toFixed(2);
            newBonus = (basicNum * 0.0833).toFixed(2);
            newLeave = (basicNum * 0.05).toFixed(2);
            newPf = (basicNum > 15000 ? 15000 * 0.13 : basicNum * 0.13).toFixed(2);
          } else {
            newHra = finalValue === "" ? "" : "0.00";
            newBonus = finalValue === "" ? "" : "0.00";
            newLeave = finalValue === "" ? "" : "0.00";
            newPf = finalValue === "" ? "" : "0.00";
          }
        } else if (name === "hra") {
          newHra = finalValue;
        } else if (name === "cca_site_allowance") {
          newCca = finalValue;
        } else if (name === "attendance_bonus") {
          newAttBonus = finalValue;
        } else if (name === "bonus") {
          newBonus = finalValue;
        } else if (name === "leave_encashment") {
          newLeave = finalValue;
        } else if (name === "transport") {
          newTransport = finalValue;
        } else if (name === "pf_13") {
          newPf = finalValue;
        } else if (name === "uniform_shoes") {
          newUniform = finalValue;
        } else if (name === "ctc") {
          newCtc = finalValue;
        }

        const bVal = parseFloat(newBasic) || 0;
        const hVal = parseFloat(newHra) || 0;
        const cVal = parseFloat(newCca) || 0;
        const aVal = parseFloat(newAttBonus) || 0;
        const bonVal = parseFloat(newBonus) || 0;
        const grossSum = bVal + hVal + cVal + aVal + bonVal;
        const autoGross = grossSum > 0 ? Math.round(grossSum).toFixed(2) : (newBasic === "" && !grossSum ? "" : "0.00");

        const grossNum = parseFloat(autoGross) || 0;
        const transNum = parseFloat(newTransport) || (grossNum > 0 ? 1500 : 0);
        const pfNum = parseFloat(newPf) || 0;
        const esicNum = grossNum > 0 ? parseFloat(((grossNum - bonVal) * 0.0325).toFixed(2)) : 0;
        const uniNum = parseFloat(newUniform) || (grossNum > 0 ? 300 : 0);
        const servNum = grossNum > 0 ? parseFloat(((grossNum + transNum + esicNum + uniNum) * 0.07).toFixed(2)) : 0;

        let calculatedCtc = newCtc;
        if (name !== "ctc") {
          calculatedCtc = grossNum > 0 ? (grossNum + transNum + pfNum + esicNum + uniNum + servNum).toFixed(2) : "0.00";
        }

        return {
          ...prev,
          basic: newBasic,
          hra: newHra,
          bonus: newBonus,
          leave_encashment: newLeave,
          cca_site_allowance: newCca,
          attendance_bonus: newAttBonus,
          gross_salary: autoGross,
          transport: newTransport || (grossNum > 0 ? "1500.00" : "0.00"),
          pf_13: newPf,
          esic_3_25: esicNum > 0 ? esicNum.toFixed(2) : "0.00",
          uniform_shoes: newUniform || (grossNum > 0 ? "300.00" : "0.00"),
          services_7: servNum > 0 ? servNum.toFixed(2) : "0.00",
          ctc: calculatedCtc,
        };
      });
      return;
    }

    setFormData((prev) => {
      const newState = { ...prev, [name]: finalValue };
      if (newState.is_permanent_same_as_current && name.startsWith("current_address_")) {
        const permanentKey = name.replace("current_", "permanent_");
        newState[permanentKey] = finalValue;
      }
      return newState;
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoFileName(file.name);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
      setRawImageSrc(url);
    }
  };

  const handlePhotoDelete = () => {
    setPhotoFile(null);
    setPhotoFileName("");
    setPhotoPreview(null);
    setRawImageSrc(null);
  };

  const handleCropSave = (croppedFile, croppedName, croppedUrl) => {
    setPhotoFile(croppedFile);
    setPhotoFileName(croppedName);
    setPhotoPreview(croppedUrl);
    setShowCropModal(false);
  };

  const handleDocUpload = (e, setFile, setFileName, setPreview) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      setFileName(file.name);
      const url = URL.createObjectURL(file);
      setPreview(url);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    const errorMessages = [];

    const mandatoryFields = [
      "first_name", "last_name", "sex", "dob", "doj", "mobile_no",
      "current_address_line1", "current_address_state", "current_address_city", "current_address_pincode"
    ];

    if (!formData.is_permanent_same_as_current) {
      mandatoryFields.push(
        "permanent_address_line1", "permanent_address_state", "permanent_address_city", "permanent_address_pincode"
      );
    }

    let hasEmptyMandatory = false;

    mandatoryFields.forEach((field) => {
      if (!formData[field] || String(formData[field]).trim() === "") {
        newErrors[field] = true;
        hasEmptyMandatory = true;
      }
    });

    if (hasEmptyMandatory) {
      errorMessages.push("Please fill in all mandatory fields.");
    }

    if (formData.mobile_no && formData.mobile_no.trim() !== "" && formData.mobile_no.length < 10) {
      newErrors.mobile_no = true;
      errorMessages.push("Mobile number must be exactly 10 digits.");
    }

    if (formData.whatsapp_no && formData.whatsapp_no.trim() !== "" && formData.whatsapp_no.length < 10) {
      newErrors.whatsapp_no = true;
      errorMessages.push("WhatsApp number must be exactly 10 digits.");
    }

    if (formData.email && formData.email.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = true;
      errorMessages.push("Please enter a valid email address.");
    }

    if (formData.adhar_no && formData.adhar_no.trim() !== "" && formData.adhar_no.length < 14) {
      newErrors.adhar_no = true;
      errorMessages.push("Aadhaar card must be exactly 12 digits.");
    }

    if (formData.ifsc_code && formData.ifsc_code.trim() !== "") {
      if (formData.ifsc_code.length !== 11 || !/^[A-Z]{4}[0-9]{7}$/.test(formData.ifsc_code)) {
        newErrors.ifsc_code = true;
        errorMessages.push("IFSC code must be exactly 11 characters.");
      }
    }

    if (errorMessages.length > 0) {
      setErrors(newErrors);
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        html: `<ul style="text-align: left; padding-left: 20px; font-size: 14px; margin: 0;">
                ${errorMessages.map((msg) => `<li style="margin-bottom: 5px;">${msg}</li>`).join("")}
               </ul>`,
      });
      return;
    }

    setLoading(true);

    try {
      const url = initialData?.id
        ? `${baseApi.replace(/\/$/, "")}/payroll/employee-details/${initialData.id}/`
        : `${baseApi.replace(/\/$/, "")}/payroll/employee-details/`;

      const method = initialData?.id ? "PUT" : "POST";

      const payload = new FormData();
      Object.keys(formData).forEach((key) => {
        if (["first_name", "middle_name", "last_name"].includes(key)) return;
        if (formData[key] !== null && formData[key] !== undefined) {
          payload.append(key, formData[key]);
        }
      });

      const fullName = [formData.first_name, formData.middle_name, formData.last_name]
        .filter(Boolean)
        .join(" ");
      payload.append("name", fullName);

      if (photoFile) {
        payload.append("photo", photoFile, photoFileName || "photo.png");
      } else if (!photoPreview && initialData?.id) {
        payload.append("photo", "");
      }

      if (adharFile) {
        payload.append("adhar_image", adharFile, adharFileName || "adhar.pdf");
      }
      if (panFile) {
        payload.append("pan_image", panFile, panFileName || "pan.pdf");
      }
      if (educationFile) {
        payload.append("education_certificate", educationFile, educationFileName || "education.pdf");
      }
      if (experienceFile) {
        payload.append("experience_certificate", experienceFile, experienceFileName || "experience.pdf");
      }

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: payload,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to save: ${res.status} ${res.statusText} ${errorText}`);
      }

      Swal.fire({
        icon: "success",
        title: initialData?.id ? "Employee Updated!" : "Employee Registered!",
        timer: 1500,
        showConfirmButton: false,
      });

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Crop Modal */}
      {showCropModal && (rawImageSrc || photoPreview) && (
        <ImageCropModal
          imageSrc={rawImageSrc || photoPreview}
          fileName={photoFileName || "employee_photo.png"}
          onCropSave={handleCropSave}
          onCancel={() => setShowCropModal(false)}
        />
      )}

      {/* Top Header & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-md hover:bg-slate-200 transition-colors"
            title="Back to Employees list"
          >
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </button>
          <h1 className="text-3xl font-bold text-slate-900">
            {initialData?.id ? "Edit Employee" : "Register a new employee"}
          </h1>
        </div>
        <p className="text-sm text-slate-500 mt-1 ml-10">
          Employee code can be entered manually or auto-generated starting from B001.
        </p>

        {/* Breadcrumb */}
        {!hideBreadcrumb && (
          customBreadcrumb ? (
            <div className="mt-3 ml-10">
              {customBreadcrumb}
            </div>
          ) : (
            <nav className="text-sm font-medium text-slate-600 mt-3 ml-10 flex items-center gap-2">
              <button
                type="button"
                onClick={onBack}
                className="hover:underline text-slate-700"
              >
                Employees
              </button>
              <span>/</span>
              <span className="text-slate-900 font-semibold">
                {initialData?.id ? "Edit Employee" : "Register Employee"}
              </span>
            </nav>
          )
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Employee Personal Details */}
        <div className="bg-white rounded-xl p-6 shadow-xs border border-slate-200 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <User className="w-5 h-5 text-sky-600" />
            <h2 className="text-lg font-bold text-slate-900">Employee Details</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Photo Upload */}
            <div className="lg:col-span-4 flex flex-col items-center">
              <label className="text-xs font-semibold text-slate-700 self-start mb-2">
                Employee Photo
              </label>

              {photoFileName || photoPreview ? (
                /* Box showing Photo Image Preview + Photo Name + Edit and Delete buttons */
                <div className="w-full h-64 border-2 border-slate-200 rounded-lg flex flex-col items-center justify-between p-3 bg-slate-50 relative overflow-hidden group">
                  {/* Photo Image Preview */}
                  <div className="w-full h-36 flex items-center justify-center rounded-md overflow-hidden bg-slate-200">
                    <img
                      src={photoPreview}
                      alt="Employee Photo"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Photo Name */}
                  <span className="text-xs font-bold text-slate-800 text-center max-w-[220px] truncate" title={photoFileName}>
                    {photoFileName || "photo_attached.png"}
                  </span>

                  {/* Edit and Delete Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCropModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 hover:text-sky-700 transition-colors shadow-2xs cursor-pointer"
                      title="Edit / Crop Photo"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePhotoDelete}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors shadow-2xs cursor-pointer"
                      title="Delete Photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Choose Photo Box */
                <label className="w-full h-64 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 transition-colors bg-slate-50 overflow-hidden relative group">
                  <div className="flex flex-col items-center text-slate-500">
                    <div className="p-3 bg-white rounded-full shadow-xs border border-slate-200 mb-2">
                      <Upload className="w-6 h-6 text-slate-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Choose photo</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Right Column: Form Fields Grid */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  EMP-code
                </label>
                <input
                  type="text"
                  name="balaji_emp_code"
                  value={formData.balaji_emp_code}
                  onChange={handleChange}
                  placeholder="e.g. B001 (Leave blank to auto-generate)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Joining <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="doj"
                  value={formData.doj}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors ${errors.doj ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50" : "border-slate-300 focus:ring-2 focus:ring-sky-500"
                    }`}
                />
              </div>

              <div className="sm:col-span-2 flex flex-col sm:flex-row gap-4">
                <div className="sm:w-28 flex-shrink-0">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Salutation
                  </label>
                  <select
                    name="salutation"
                    value={formData.salutation}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Miss">Miss</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Dr.">Dr.</option>
                  </select>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      placeholder="First name"
                      className={`w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors ${errors.first_name ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50" : "border-slate-300 focus:ring-2 focus:ring-sky-500"
                        }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      name="middle_name"
                      value={formData.middle_name}
                      onChange={handleChange}
                      placeholder="Middle name"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      placeholder="Last name"
                      className={`w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors ${errors.last_name ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50" : "border-slate-300 focus:ring-2 focus:ring-sky-500"
                        }`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sex <span className="text-red-500">*</span>
                </label>
                <select
                  name="sex"
                  value={formData.sex}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors ${errors.sex ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50" : "border-slate-300 focus:ring-2 focus:ring-sky-500 bg-white"
                    }`}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors ${errors.dob ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50" : "border-slate-300 focus:ring-2 focus:ring-sky-500"
                    }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="mobile_no"
                  value={formData.mobile_no}
                  onChange={handleChange}
                  maxLength={10}
                  placeholder="10-digit Mobile Number"
                  className={`w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors ${errors.mobile_no
                    ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50"
                    : "border-slate-300 focus:ring-2 focus:ring-sky-500"
                    }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    WhatsApp Number
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.mobile_no) {
                        setFormData((prev) => ({ ...prev, whatsapp_no: prev.mobile_no }));
                        setErrors((prev) => ({ ...prev, whatsapp_no: false }));
                      }
                    }}
                    className="text-[11px] text-sky-600 hover:text-sky-800 font-medium hover:underline cursor-pointer"
                  >
                    Same as Mobile
                  </button>
                </div>
                <input
                  type="text"
                  name="whatsapp_no"
                  value={formData.whatsapp_no}
                  onChange={handleChange}
                  maxLength={10}
                  placeholder="10-digit WhatsApp Number"
                  className={`w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors ${errors.whatsapp_no
                    ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50"
                    : "border-slate-300 focus:ring-2 focus:ring-sky-500"
                    }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email address"
                  className={`w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors ${errors.email
                    ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50"
                    : "border-slate-300 focus:ring-2 focus:ring-sky-500"
                    }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Marital Status
                </label>
                <select
                  name="marital_status"
                  value={formData.marital_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                >
                  <option value="Not Married">Not Married</option>
                  <option value="Married">Married</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Father / Husband Name
                </label>
                <input
                  type="text"
                  name="father_or_husband_name"
                  value={formData.father_or_husband_name}
                  onChange={handleChange}
                  placeholder="Father or Husband Full Name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Educational Qualification
                </label>
                <input
                  type="text"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                  placeholder="e.g. B.Tech / Graduate / 12th"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Emergency Contact No.
                </label>
                <input
                  type="text"
                  name="emergency_contact_no"
                  value={formData.emergency_contact_no}
                  onChange={handleChange}
                  maxLength={10}
                  placeholder="10-digit Emergency Number"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Identification Mark
                </label>
                <input
                  type="text"
                  name="identity_mark"
                  value={formData.identity_mark}
                  onChange={handleChange}
                  placeholder="e.g. Mole on right cheek"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Detailed Address Section */}
              <div className="sm:col-span-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-6">

                {/* Current Address */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">Current Address</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Address Line 1 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="current_address_line1"
                        value={formData.current_address_line1}
                        onChange={handleChange}
                        placeholder="House No, Building Name..."
                        className={`w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors ${errors.current_address_line1 ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50" : "border-slate-300 focus:ring-2 focus:ring-sky-500"
                          }`}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Address Line 2</label>
                      <input
                        type="text"
                        name="current_address_line2"
                        value={formData.current_address_line2}
                        onChange={handleChange}
                        placeholder="Street, Area, Landmark..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        State <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="current_address_state"
                        value={formData.current_address_state}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors bg-white ${errors.current_address_state ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50" : "border-slate-300 focus:ring-2 focus:ring-sky-500"
                          }`}
                      >
                        <option value="">Select State</option>
                        {INDIAN_STATES.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="current_address_city"
                        value={formData.current_address_city}
                        onChange={handleChange}
                        placeholder="City / District"
                        className={`w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors ${errors.current_address_city ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50" : "border-slate-300 focus:ring-2 focus:ring-sky-500"
                          }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Pincode <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="current_address_pincode"
                        value={formData.current_address_pincode}
                        onChange={handleChange}
                        maxLength={6}
                        placeholder="6-digit Pincode"
                        className={`w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors ${errors.current_address_pincode ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50" : "border-slate-300 focus:ring-2 focus:ring-sky-500"
                          }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Permanent Address */}
                <div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                    <h4 className="text-sm font-semibold text-slate-800">Permanent Address</h4>
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_permanent_same_as_current"
                        checked={formData.is_permanent_same_as_current}
                        onChange={handleChange}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      Same as Current Address
                    </label>
                  </div>

                  {!formData.is_permanent_same_as_current && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Address Line 1 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="permanent_address_line1"
                          value={formData.permanent_address_line1}
                          onChange={handleChange}
                          placeholder="House No, Building Name..."
                          className={`w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors ${errors.permanent_address_line1 ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50" : "border-slate-300 focus:ring-2 focus:ring-sky-500"
                            }`}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Address Line 2</label>
                        <input
                          type="text"
                          name="permanent_address_line2"
                          value={formData.permanent_address_line2}
                          onChange={handleChange}
                          placeholder="Street, Area, Landmark..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          State <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="permanent_address_state"
                          value={formData.permanent_address_state}
                          onChange={handleChange}
                          className={`w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors bg-white ${errors.permanent_address_state ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50" : "border-slate-300 focus:ring-2 focus:ring-sky-500"
                            }`}
                        >
                          <option value="">Select State</option>
                          {INDIAN_STATES.map(state => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="permanent_address_city"
                          value={formData.permanent_address_city}
                          onChange={handleChange}
                          placeholder="City / District"
                          className={`w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors ${errors.permanent_address_city ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50" : "border-slate-300 focus:ring-2 focus:ring-sky-500"
                            }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Pincode <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="permanent_address_pincode"
                          value={formData.permanent_address_pincode}
                          onChange={handleChange}
                          maxLength={6}
                          placeholder="6-digit Pincode"
                          className={`w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors ${errors.permanent_address_pincode ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50" : "border-slate-300 focus:ring-2 focus:ring-sky-500"
                            }`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Banking Details */}
        <div className="bg-white rounded-xl p-6 shadow-xs border border-slate-200 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <CreditCard className="w-5 h-5 text-sky-600" />
            <h2 className="text-lg font-bold text-slate-900">Banking Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adhar No.
              </label>
              <input
                type="text"
                name="adhar_no"
                value={formData.adhar_no}
                onChange={handleChange}
                maxLength={14}
                placeholder="XXXX-XXXX-XXXX"
                className={`w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors font-mono tracking-wide ${errors.adhar_no
                  ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50"
                  : "border-slate-300 focus:ring-2 focus:ring-sky-500"
                  }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bank A/C Number
              </label>
              <input
                type="text"
                name="account_no"
                value={formData.account_no}
                onChange={handleChange}
                placeholder="Bank Account Number"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                placeholder="Bank Name"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                name="ifsc_code"
                value={formData.ifsc_code}
                onChange={handleChange}
                maxLength={11}
                placeholder="e.g. SBIN0001234"
                className={`w-full px-3 py-2 border rounded-md text-sm uppercase outline-none transition-colors font-mono ${errors.ifsc_code
                  ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50"
                  : "border-slate-300 focus:ring-2 focus:ring-sky-500"
                  }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                UAN No.
              </label>
              <input
                type="text"
                name="uan_no"
                value={formData.uan_no}
                onChange={handleChange}
                placeholder="UAN Number"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ESIC No.
              </label>
              <input
                type="text"
                name="esic_no"
                value={formData.esic_no}
                onChange={handleChange}
                placeholder="ESIC Number"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PAN Number
              </label>
              <input
                type="text"
                name="pan_number"
                value={formData.pan_number}
                onChange={handleChange}
                maxLength={10}
                placeholder="e.g. ABCDE1234F"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm uppercase font-mono outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nominee Name
              </label>
              <input
                type="text"
                name="nominee_name"
                value={formData.nominee_name}
                onChange={handleChange}
                placeholder="Nominee full name"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Job & Work Profile */}
        <div className="bg-white rounded-xl p-6 shadow-xs border border-slate-200 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Briefcase className="w-5 h-5 text-sky-600" />
            <h2 className="text-lg font-bold text-slate-900">Job & Profile Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="Department"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Designation
              </label>
              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                placeholder="Designation"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-white"
              >
                <option value="Skilled">ITI's (Skilled)</option>
                <option value="Semi-Skilled">12th (Semi-Skilled)</option>
                <option value="Unskilled">Un-Skilled</option>
                <option value="Diploma (Skilled-1)">Diploma (Skilled-1)</option>
                <option value="Shift Supervisors (Skilled)">Shift Supervisors (Skilled)</option>
                <option value="Hydra Driver (Skilled)">Hydra Driver (Skilled)</option>
                <option value="Welder">Welder</option>
                <option value="Executive">Executive</option>
                <option value="Managerial">Managerial</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Calculation Days
              </label>
              <input
                type="number"
                name="calculation_days"
                value={formData.calculation_days}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Salary Structure & Allowances */}
        <div className="bg-white rounded-xl p-6 shadow-xs border border-slate-200 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Calculator className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">Salary & Allowances</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Basic
              </label>
              <input
                type="number"
                step="0.01"
                name="basic"
                value={formData.basic}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                HRA
              </label>
              <input
                type="number"
                step="0.01"
                name="hra"
                value={formData.hra}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                CCA / Site Allowance
              </label>
              <input
                type="number"
                step="0.01"
                name="cca_site_allowance"
                value={formData.cca_site_allowance}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Attendance Bonus
              </label>
              <input
                type="number"
                step="0.01"
                name="attendance_bonus"
                value={formData.attendance_bonus}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bonus
              </label>
              <input
                type="number"
                step="0.01"
                name="bonus"
                value={formData.bonus}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Leave Encashment
              </label>
              <input
                type="number"
                step="0.01"
                name="leave_encashment"
                value={formData.leave_encashment}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gross Salary
              </label>
              <input
                type="number"
                step="0.01"
                name="gross_salary"
                value={formData.gross_salary}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PF
              </label>
              <input
                type="number"
                step="0.01"
                name="pf_13"
                value={formData.pf_13}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                CTC
              </label>
              <input
                type="number"
                step="0.01"
                name="ctc"
                value={formData.ctc}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Documentation */}
        <div className="bg-white rounded-xl p-6 shadow-xs border border-slate-200 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <FileText className="w-5 h-5 text-sky-600" />
            <h2 className="text-lg font-bold text-slate-900">Documentation</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Aadhaar Card */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col justify-between">
              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1">Aadhaar Card</span>
                <p className="text-[11px] text-slate-500 mb-3">Upload Aadhaar PDF / Image</p>
              </div>
              {adharPreview || adharFileName ? (
                <div className="flex flex-col items-center gap-2 bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-xs font-medium text-slate-700 truncate max-w-[180px]" title={adharFileName}>{adharFileName || "Aadhaar Document"}</span>
                  <div className="flex items-center gap-2">
                    {adharPreview && (
                      <a href={adharPreview} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 hover:underline">
                        View
                      </a>
                    )}
                    <button type="button" onClick={() => { setAdharFile(null); setAdharFileName(""); setAdharPreview(null); }} className="text-xs text-red-600 hover:underline">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-4 cursor-pointer hover:bg-slate-100 transition-colors bg-white">
                  <Upload className="w-5 h-5 text-slate-500 mb-1" />
                  <span className="text-xs font-medium text-slate-600">Upload Aadhaar</span>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => handleDocUpload(e, setAdharFile, setAdharFileName, setAdharPreview)} className="hidden" />
                </label>
              )}
            </div>

            {/* PAN Card */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col justify-between">
              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1">PAN Card</span>
                <p className="text-[11px] text-slate-500 mb-3">Upload PAN PDF / Image</p>
              </div>
              {panPreview || panFileName ? (
                <div className="flex flex-col items-center gap-2 bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-xs font-medium text-slate-700 truncate max-w-[180px]" title={panFileName}>{panFileName || "PAN Document"}</span>
                  <div className="flex items-center gap-2">
                    {panPreview && (
                      <a href={panPreview} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 hover:underline">
                        View
                      </a>
                    )}
                    <button type="button" onClick={() => { setPanFile(null); setPanFileName(""); setPanPreview(null); }} className="text-xs text-red-600 hover:underline">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-4 cursor-pointer hover:bg-slate-100 transition-colors bg-white">
                  <Upload className="w-5 h-5 text-slate-500 mb-1" />
                  <span className="text-xs font-medium text-slate-600">Upload PAN</span>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => handleDocUpload(e, setPanFile, setPanFileName, setPanPreview)} className="hidden" />
                </label>
              )}
            </div>

            {/* Education Certificate / Marksheets */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col justify-between">
              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1">Education Certificate / Marksheets</span>
                <p className="text-[11px] text-slate-500 mb-3">Upload Marksheet PDF / Image</p>
              </div>
              {educationPreview || educationFileName ? (
                <div className="flex flex-col items-center gap-2 bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-xs font-medium text-slate-700 truncate max-w-[180px]" title={educationFileName}>{educationFileName || "Education Certificate"}</span>
                  <div className="flex items-center gap-2">
                    {educationPreview && (
                      <a href={educationPreview} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 hover:underline">
                        View
                      </a>
                    )}
                    <button type="button" onClick={() => { setEducationFile(null); setEducationFileName(""); setEducationPreview(null); }} className="text-xs text-red-600 hover:underline">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-4 cursor-pointer hover:bg-slate-100 transition-colors bg-white">
                  <Upload className="w-5 h-5 text-slate-500 mb-1" />
                  <span className="text-xs font-medium text-slate-600">Upload Certificate</span>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => handleDocUpload(e, setEducationFile, setEducationFileName, setEducationPreview)} className="hidden" />
                </label>
              )}
            </div>

            {/* Experience Certificate */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col justify-between">
              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1">Experience Certificate (Optional)</span>
                <p className="text-[11px] text-slate-500 mb-3">Upload Experience Certificate</p>
              </div>
              {experiencePreview || experienceFileName ? (
                <div className="flex flex-col items-center gap-2 bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-xs font-medium text-slate-700 truncate max-w-[180px]" title={experienceFileName}>{experienceFileName || "Experience Certificate"}</span>
                  <div className="flex items-center gap-2">
                    {experiencePreview && (
                      <a href={experiencePreview} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 hover:underline">
                        View
                      </a>
                    )}
                    <button type="button" onClick={() => { setExperienceFile(null); setExperienceFileName(""); setExperiencePreview(null); }} className="text-xs text-red-600 hover:underline">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-4 cursor-pointer hover:bg-slate-100 transition-colors bg-white">
                  <Upload className="w-5 h-5 text-slate-500 mb-1" />
                  <span className="text-xs font-medium text-slate-600">Upload Experience</span>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => handleDocUpload(e, setExperienceFile, setExperienceFileName, setExperiencePreview)} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium text-sm hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-7 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? "Saving..." : initialData ? "Update Employee" : "Save Employee"}
          </button>
        </div>
      </form>
    </div>
  );
}
