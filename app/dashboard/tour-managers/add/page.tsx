"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Box,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
} from "@mui/material";
import {
  Save,
  ArrowBack,
  Add,
  Delete,
  Image as ImageIcon,
  AccessTime,
  AttachMoney,
  List,
  X,
  Person,
} from "@mui/icons-material";
import Link from "next/link";
import axios from "axios";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { Editor } from "react-draft-wysiwyg";
import { EditorState, ContentState, convertFromHTML } from "draft-js";
import { stateToHTML } from "draft-js-export-html";

/* ================== Types ================== */
type IDType = string | { $oid: string };

interface GalleryItem {
  tag: string;
  url: string;
}

interface OperationProcessItem {
  time: string;
  title: string;
  description: string;
}

interface ProfileItem {
  name: string;
  profilePic: string;
  experience: string;
  description: string;
}

interface TourManagerFormData {
  userId?: string;
  managerId: string;
  title: string;
  description: string;
  gallery: GalleryItem[];
  language: string[][]; // Array of language combinations
  general_info: string;
  price_breakdown: {
    basePrice: number;
    serviceCharges: number;
    taxes: number;
    totalPrice: number;
    priceNote: string;
  };
  operationProcess: OperationProcessItem[];
  inclusions: string[];
  exclusions: string[];
  timings: {
    from: string;
    to: string;
  };
  tourManagerProfiles: ProfileItem[];
  tourGuideProfiles: ProfileItem[];
}

const unwrapId = (id?: IDType) => (typeof id === "string" ? id : id?.$oid ?? "");

const htmlToEditorState = (html?: string) => {
  const safe = (html ?? "").trim();
  if (!safe) return EditorState.createEmpty();
  const blocks = convertFromHTML(safe);
  const content = ContentState.createFromBlockArray(blocks.contentBlocks, blocks.entityMap);
  return EditorState.createWithContent(content);
};

const sanitizeHtml = (html: string) =>
  html
    .replace(/[\n\r]/g, "")
    .replace(/>\s+</g, "><");

interface AddEditTourManagerPageProps {
  editId?: string;
}

export default function AddEditTourManagerPage({ editId }: AddEditTourManagerPageProps) {
  const router = useRouter();
  const params = useParams();
  const id = editId || (params?.id as string | undefined);
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [formData, setFormData] = useState<TourManagerFormData>({
    managerId: "",
    title: "",
    description: "",
    gallery: [],
    language: [],
    general_info: "",
    price_breakdown: {
      basePrice: 0,
      serviceCharges: 0,
      taxes: 0,
      totalPrice: 0,
      priceNote: "",
    },
    operationProcess: [],
    inclusions: [],
    exclusions: [],
    timings: {
      from: "08:00 AM",
      to: "07:00 PM",
    },
    tourManagerProfiles: [],
    tourGuideProfiles: [],
  });

  const [langComboInput, setLangComboInput] = useState(""); // For adding new language combination
  const [newLangInput, setNewLangInput] = useState(""); // For adding a language to current combination
  const [editingComboIndex, setEditingComboIndex] = useState<number | null>(null);
  const [inclusionInput, setInclusionInput] = useState("");
  const [exclusionInput, setExclusionInput] = useState("");
  const [galleryTagInput, setGalleryTagInput] = useState("");
  const [galleryUrlInput, setGalleryUrlInput] = useState("");
  
  // Profile inputs
  const [managerProfileInput, setManagerProfileInput] = useState<ProfileItem>({
    name: "",
    profilePic: "",
    experience: "",
    description: "",
  });
  const [guideProfileInput, setGuideProfileInput] = useState<ProfileItem>({
    name: "",
    profilePic: "",
    experience: "",
    description: "",
  });

  // Operation process editors
  const [operationEditors, setOperationEditors] = useState<EditorState[]>([]);
  const [generalInfoEditor, setGeneralInfoEditor] = useState<EditorState>(EditorState.createEmpty());
  const [descriptionEditor, setDescriptionEditor] = useState<EditorState>(EditorState.createEmpty());

  // Fetch existing data for edit
  useEffect(() => {
    if (!isEdit || !id) return;

    const fetchManager = async () => {
      try {
        setFetching(true);
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE}tour-managers/${id}`);
        const data = res.data.data;

        if (data) {
          setFormData({
            userId: unwrapId(data.userId),
            managerId: data.managerId || "",
            title: data.title || "",
            description: data.description || "",
            gallery: Array.isArray(data.gallery) ? data.gallery : [],
            language: Array.isArray(data.language)
              ? data.language.map((combo: any) =>
                  Array.isArray(combo) ? combo : typeof combo === "string" ? [combo] : []
                )
              : [],
            general_info: data.general_info || "",
            price_breakdown: {
              basePrice: data.price_breakdown?.basePrice || 0,
              serviceCharges: data.price_breakdown?.serviceCharges || 0,
              taxes: data.price_breakdown?.taxes || 0,
              totalPrice: data.price_breakdown?.totalPrice || 0,
              priceNote: data.price_breakdown?.priceNote || "",
            },
            operationProcess: Array.isArray(data.operationProcess) ? data.operationProcess : [],
            inclusions: Array.isArray(data.inclusions) ? data.inclusions : [],
            exclusions: Array.isArray(data.exclusions) ? data.exclusions : [],
            timings: {
              from: data.timings?.from || "08:00 AM",
              to: data.timings?.to || "07:00 PM",
            },
            tourManagerProfiles: Array.isArray(data.tourManagerProfiles) ? data.tourManagerProfiles : [],
            tourGuideProfiles: Array.isArray(data.tourGuideProfiles) ? data.tourGuideProfiles : [],
          });

          // Set editors
          setGeneralInfoEditor(htmlToEditorState(data.general_info));
          setDescriptionEditor(htmlToEditorState(data.description));
          setOperationEditors(
            (data.operationProcess || []).map((op: OperationProcessItem) =>
              htmlToEditorState(op.description)
            )
          );
        }
      } catch (error) {
        console.error("Error fetching tour manager:", error);
        alert("Failed to load tour manager data");
      } finally {
        setFetching(false);
      }
    };

    fetchManager();
  }, [isEdit, id]);

  // Update total price when base price, service charges, or taxes change
  useEffect(() => {
    const total =
      (formData.price_breakdown.basePrice || 0) +
      (formData.price_breakdown.serviceCharges || 0) +
      (formData.price_breakdown.taxes || 0);
    setFormData((prev) => ({
      ...prev,
      price_breakdown: { ...prev.price_breakdown, totalPrice: total },
    }));
  }, [formData.price_breakdown.basePrice, formData.price_breakdown.serviceCharges, formData.price_breakdown.taxes]);

  const handleInputChange = (field: keyof TourManagerFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent: keyof TourManagerFormData, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as any),
        [field]: value,
      },
    }));
  };

  const addToArray = (
    field: "inclusions" | "exclusions" | "gallery",
    value?: string,
    item?: GalleryItem
  ) => {
    if (field === "gallery" && item) {
      setFormData((prev) => ({
        ...prev,
        gallery: [...prev.gallery, item],
      }));
      setGalleryTagInput("");
      setGalleryUrlInput("");
      return;
    }
    if (value && value.trim()) {
      setFormData((prev) => ({
        ...prev,
        [field]: [...prev[field], value.trim()],
      }));
    }
  };

  const removeFromArray = (
    field: "inclusions" | "exclusions" | "gallery" | "operationProcess",
    index: number
  ) => {
    if (field === "operationProcess") {
      setFormData((prev) => ({
        ...prev,
        operationProcess: prev.operationProcess.filter((_, i) => i !== index),
      }));
      setOperationEditors((prev) => prev.filter((_, i) => i !== index));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index),
      }));
    }
  };

  const addLanguageCombination = () => {
    if (!langComboInput.trim()) return;
    const languages = langComboInput
      .split(",")
      .map((lang) => lang.trim())
      .filter((lang) => lang.length > 0);
    if (languages.length === 0) return;
    setFormData((prev) => ({
      ...prev,
      language: [...prev.language, languages],
    }));
    setLangComboInput("");
  };

  const removeLanguageCombination = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      language: prev.language.filter((_, i) => i !== index),
    }));
  };

  const addLanguageToCombination = (comboIndex: number, lang: string) => {
    if (!lang.trim()) return;
    setFormData((prev) => ({
      ...prev,
      language: prev.language.map((combo, i) =>
        i === comboIndex ? [...combo, lang.trim()] : combo
      ),
    }));
    setNewLangInput("");
  };

  const removeLanguageFromCombination = (comboIndex: number, langIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      language: prev.language.map((combo, i) =>
        i === comboIndex ? combo.filter((_, j) => j !== langIndex) : combo
      ),
    }));
  };

  const addManagerProfile = () => {
    if (!managerProfileInput.name.trim()) {
      alert("Please enter at least a name for the profile");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      tourManagerProfiles: [...prev.tourManagerProfiles, { ...managerProfileInput }],
    }));
    setManagerProfileInput({ name: "", profilePic: "", experience: "", description: "" });
  };

  const removeManagerProfile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      tourManagerProfiles: prev.tourManagerProfiles.filter((_, i) => i !== index),
    }));
  };

  const addGuideProfile = () => {
    if (!guideProfileInput.name.trim()) {
      alert("Please enter at least a name for the profile");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      tourGuideProfiles: [...prev.tourGuideProfiles, { ...guideProfileInput }],
    }));
    setGuideProfileInput({ name: "", profilePic: "", experience: "", description: "" });
  };

  const removeGuideProfile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      tourGuideProfiles: prev.tourGuideProfiles.filter((_, i) => i !== index),
    }));
  };

  const addOperationProcess = () => {
    setFormData((prev) => ({
      ...prev,
      operationProcess: [...prev.operationProcess, { time: "", title: "", description: "" }],
    }));
    setOperationEditors((prev) => [...prev, EditorState.createEmpty()]);
  };

  const updateOperationProcess = (index: number, field: "time" | "title", value: string) => {
    setFormData((prev) => ({
      ...prev,
      operationProcess: prev.operationProcess.map((op, i) =>
        i === index ? { ...op, [field]: value } : op
      ),
    }));
  };

  const updateOperationDescription = (index: number, editorState: EditorState) => {
    setOperationEditors((prev) => {
      const newEditors = [...prev];
      newEditors[index] = editorState;
      return newEditors;
    });
    const html = sanitizeHtml(stateToHTML(editorState.getCurrentContent()));
    setFormData((prev) => ({
      ...prev,
      operationProcess: prev.operationProcess.map((op, i) =>
        i === index ? { ...op, description: html } : op
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.managerId) {
      alert("Please fill in Title and Manager ID");
      return;
    }

    try {
      setLoading(true);

      const descriptionHtml = sanitizeHtml(stateToHTML(descriptionEditor.getCurrentContent()));
      const generalInfoHtml = sanitizeHtml(stateToHTML(generalInfoEditor.getCurrentContent()));

      const payload = {
        ...formData,
        userId: formData.userId || undefined,
        description: descriptionHtml,
        general_info: generalInfoHtml,
      };

      const url = isEdit
        ? `${process.env.NEXT_PUBLIC_API_BASE}tour-managers/${id}`
        : `${process.env.NEXT_PUBLIC_API_BASE}tour-managers`;

      if (isEdit) {
        await axios.patch(url, payload);
        alert("Tour manager updated successfully! ✅");
      } else {
        await axios.post(url, payload);
        alert("Tour manager created successfully! 🎉");
      }

      router.push("/dashboard/tour-managers");
    } catch (error: any) {
      console.error("Error saving tour manager:", error);
      alert(`Failed to save: ${error?.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Button
          component={Link}
          href="/dashboard/tour-managers"
          startIcon={<ArrowBack />}
          variant="outlined"
        >
          Back
        </Button>
        <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
          {isEdit ? "Edit Tour Manager" : "Add Tour Manager"}
        </Typography>
      </Stack>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Basic Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      label="Manager ID"
                      value={formData.managerId}
                      onChange={(e) => handleInputChange("managerId", e.target.value)}
                      placeholder="TM001"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="User ID"
                      value={formData.userId || ""}
                      onChange={(e) => handleInputChange("userId", e.target.value)}
                      placeholder="674fdc001234abcd00009901"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      label="Title"
                      value={formData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      placeholder="Goa Tour Manager"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Description
                    </Typography>
                    <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 1 }}>
                      <Editor
                        editorState={descriptionEditor}
                        onEditorStateChange={setDescriptionEditor}
                        toolbar={{
                          options: ["inline", "list"],
                          inline: { options: ["bold", "italic", "underline"] },
                          list: { options: ["unordered", "ordered"] },
                        }}
                        editorClassName="min-h-[100px] px-2"
                      />
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Gallery */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  <ImageIcon /> Gallery
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth
                      label="Tag"
                      value={galleryTagInput}
                      onChange={(e) => setGalleryTagInput(e.target.value)}
                      placeholder="beach, adventure, heritage, etc."
                    />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth
                      label="Image URL"
                      value={galleryUrlInput}
                      onChange={(e) => setGalleryUrlInput(e.target.value)}
                      placeholder="https://..."
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Add />}
                      onClick={() =>
                        addToArray("gallery", undefined, {
                          tag: galleryTagInput,
                          url: galleryUrlInput,
                        })
                      }
                      disabled={!galleryTagInput || !galleryUrlInput}
                    >
                      Add
                    </Button>
                  </Grid>
                </Grid>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
                  {formData.gallery.map((item, idx) => (
                    <Chip
                      key={idx}
                      label={`${item.tag}: ${item.url.substring(0, 30)}...`}
                      onDelete={() => removeFromArray("gallery", idx)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Language Combinations */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Language Combinations
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Add language combinations (e.g., "Hindi, English" or "Tamil, Hindi"). Each combination represents languages that work together.
                </Typography>
                
                {/* Add New Combination */}
                <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Add Language Combination (comma-separated)"
                    placeholder="e.g., Hindi, English"
                    value={langComboInput}
                    onChange={(e) => setLangComboInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addLanguageCombination();
                      }
                    }}
                  />
                  <Button
                    variant="outlined"
                    onClick={addLanguageCombination}
                    startIcon={<Add />}
                  >
                    Add Combination
                  </Button>
                </Stack>

                {/* Display Existing Combinations */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {formData.language.map((combo, comboIndex) => (
                    <Card key={comboIndex} variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Combination {comboIndex + 1}
                        </Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeLanguageCombination(comboIndex)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1 }}>
                        {combo.map((lang, langIndex) => (
                          <Chip
                            key={langIndex}
                            label={lang}
                            onDelete={() => removeLanguageFromCombination(comboIndex, langIndex)}
                            color="primary"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                      {/* Add language to this combination */}
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <TextField
                          size="small"
                          fullWidth
                          placeholder="Add language to this combination"
                          value={editingComboIndex === comboIndex ? newLangInput : ""}
                          onChange={(e) => {
                            setEditingComboIndex(comboIndex);
                            setNewLangInput(e.target.value);
                          }}
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && editingComboIndex === comboIndex) {
                              e.preventDefault();
                              addLanguageToCombination(comboIndex, newLangInput);
                            }
                          }}
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            if (editingComboIndex === comboIndex) {
                              addLanguageToCombination(comboIndex, newLangInput);
                            } else {
                              setEditingComboIndex(comboIndex);
                            }
                          }}
                        >
                          {editingComboIndex === comboIndex ? "Add" : "Edit"}
                        </Button>
                      </Stack>
                    </Card>
                  ))}
                  {formData.language.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
                      No language combinations added yet. Add your first combination above.
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* General Info */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  General Information
                </Typography>
                <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 1 }}>
                  <Editor
                    editorState={generalInfoEditor}
                    onEditorStateChange={setGeneralInfoEditor}
                    toolbar={{
                      options: ["inline", "list"],
                      inline: { options: ["bold", "italic", "underline"] },
                      list: { options: ["unordered", "ordered"] },
                    }}
                    editorClassName="min-h-[150px] px-2"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Price Breakdown */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  <AttachMoney /> Price Breakdown
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Base Price"
                      value={formData.price_breakdown.basePrice}
                      onChange={(e) =>
                        handleNestedChange("price_breakdown", "basePrice", Number(e.target.value))
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Service Charges"
                      value={formData.price_breakdown.serviceCharges}
                      onChange={(e) =>
                        handleNestedChange("price_breakdown", "serviceCharges", Number(e.target.value))
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Taxes"
                      value={formData.price_breakdown.taxes}
                      onChange={(e) =>
                        handleNestedChange("price_breakdown", "taxes", Number(e.target.value))
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Total Price"
                      value={formData.price_breakdown.totalPrice}
                      InputProps={{ readOnly: true }}
                      sx={{ bgcolor: "#f5f5f5" }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Price Note"
                      multiline
                      rows={2}
                      value={formData.price_breakdown.priceNote}
                      onChange={(e) =>
                        handleNestedChange("price_breakdown", "priceNote", e.target.value)
                      }
                      placeholder="Prices may vary during peak season..."
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Operation Process */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <AccessTime /> Operation Process
                  </Typography>
                  <Button variant="outlined" startIcon={<Add />} onClick={addOperationProcess}>
                    Add Step
                  </Button>
                </Box>
                <Stack spacing={2}>
                  {formData.operationProcess.map((op, idx) => (
                    <Box key={idx} sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 2 }}>
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            label="Time"
                            value={op.time}
                            onChange={(e) => updateOperationProcess(idx, "time", e.target.value)}
                            placeholder="Before Tour Start"
                          />
                        </Grid>
                        <Grid item xs={12} sm={8}>
                          <TextField
                            fullWidth
                            label="Title"
                            value={op.title}
                            onChange={(e) => updateOperationProcess(idx, "title", e.target.value)}
                            placeholder="Meet Your Tour Manager"
                          />
                        </Grid>
                      </Grid>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Description
                      </Typography>
                      <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 1 }}>
                        <Editor
                          editorState={operationEditors[idx] || EditorState.createEmpty()}
                          onEditorStateChange={(editorState) =>
                            updateOperationDescription(idx, editorState)
                          }
                          toolbar={{
                            options: ["inline", "list"],
                            inline: { options: ["bold", "italic", "underline"] },
                            list: { options: ["unordered", "ordered"] },
                          }}
                          editorClassName="min-h-[80px] px-2"
                        />
                      </Box>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<Delete />}
                        onClick={() => removeFromArray("operationProcess", idx)}
                        sx={{ mt: 1 }}
                      >
                        Remove
                      </Button>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Inclusions & Exclusions */}
          <Grid item xs={12} sm={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  <List /> Inclusions
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Add Inclusion"
                    value={inclusionInput}
                    onChange={(e) => setInclusionInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addToArray("inclusions", inclusionInput);
                        setInclusionInput("");
                      }
                    }}
                  />
                  <Button
                    variant="outlined"
                    onClick={() => {
                      addToArray("inclusions", inclusionInput);
                      setInclusionInput("");
                    }}
                  >
                    Add
                  </Button>
                </Stack>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {formData.inclusions.map((item, idx) => (
                    <Chip
                      key={idx}
                      label={item}
                      onDelete={() => removeFromArray("inclusions", idx)}
                      color="success"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  <List /> Exclusions
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Add Exclusion"
                    value={exclusionInput}
                    onChange={(e) => setExclusionInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addToArray("exclusions", exclusionInput);
                        setExclusionInput("");
                      }
                    }}
                  />
                  <Button
                    variant="outlined"
                    onClick={() => {
                      addToArray("exclusions", exclusionInput);
                      setExclusionInput("");
                    }}
                  >
                    Add
                  </Button>
                </Stack>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {formData.exclusions.map((item, idx) => (
                    <Chip
                      key={idx}
                      label={item}
                      onDelete={() => removeFromArray("exclusions", idx)}
                      color="error"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Timings */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  <AccessTime /> Timings
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="From"
                      value={formData.timings.from}
                      onChange={(e) => handleNestedChange("timings", "from", e.target.value)}
                      placeholder="08:00 AM"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="To"
                      value={formData.timings.to}
                      onChange={(e) => handleNestedChange("timings", "to", e.target.value)}
                      placeholder="07:00 PM"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Tour Manager Profiles */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  <Person /> Tour Manager Profiles
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Add profiles for tour managers who will handle tours.
                </Typography>

                {/* Add New Profile Form */}
                <Card variant="outlined" sx={{ mb: 3, p: 2, bgcolor: "grey.50" }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Name *"
                        value={managerProfileInput.name}
                        onChange={(e) => setManagerProfileInput({ ...managerProfileInput, name: e.target.value })}
                        placeholder="e.g., Rahul Verma"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Experience"
                        value={managerProfileInput.experience}
                        onChange={(e) => setManagerProfileInput({ ...managerProfileInput, experience: e.target.value })}
                        placeholder="e.g., 5+ years"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Profile Picture URL"
                        value={managerProfileInput.profilePic}
                        onChange={(e) => setManagerProfileInput({ ...managerProfileInput, profilePic: e.target.value })}
                        placeholder="https://..."
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        multiline
                        rows={2}
                        label="Description"
                        value={managerProfileInput.description}
                        onChange={(e) => setManagerProfileInput({ ...managerProfileInput, description: e.target.value })}
                        placeholder="Expert in Goa sightseeing, water sports coordination..."
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={addManagerProfile}
                        disabled={!managerProfileInput.name.trim()}
                      >
                        Add Manager Profile
                      </Button>
                    </Grid>
                  </Grid>
                </Card>

                {/* Existing Profiles */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {formData.tourManagerProfiles.map((profile, idx) => (
                    <Card key={idx} variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: "flex", gap: 2 }}>
                        {profile.profilePic && (
                          <Box
                            component="img"
                            src={profile.profilePic}
                            alt={profile.name}
                            sx={{
                              width: 80,
                              height: 80,
                              objectFit: "cover",
                              borderRadius: 1,
                              flexShrink: 0,
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        )}
                        <Box sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {profile.name}
                              </Typography>
                              {profile.experience && (
                                <Typography variant="body2" color="text.secondary">
                                  {profile.experience}
                                </Typography>
                              )}
                            </Box>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeManagerProfile(idx)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                          {profile.description && (
                            <Typography variant="body2" color="text.secondary">
                              {profile.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Card>
                  ))}
                  {formData.tourManagerProfiles.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
                      No tour manager profiles added yet.
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Tour Guide Profiles */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  <Person /> Tour Guide Profiles
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Add profiles for tour guides who will lead tours.
                </Typography>

                {/* Add New Profile Form */}
                <Card variant="outlined" sx={{ mb: 3, p: 2, bgcolor: "grey.50" }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Name *"
                        value={guideProfileInput.name}
                        onChange={(e) => setGuideProfileInput({ ...guideProfileInput, name: e.target.value })}
                        placeholder="e.g., Sneha Kulkarni"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Experience"
                        value={guideProfileInput.experience}
                        onChange={(e) => setGuideProfileInput({ ...guideProfileInput, experience: e.target.value })}
                        placeholder="e.g., 3+ years"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Profile Picture URL"
                        value={guideProfileInput.profilePic}
                        onChange={(e) => setGuideProfileInput({ ...guideProfileInput, profilePic: e.target.value })}
                        placeholder="https://..."
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        multiline
                        rows={2}
                        label="Description"
                        value={guideProfileInput.description}
                        onChange={(e) => setGuideProfileInput({ ...guideProfileInput, description: e.target.value })}
                        placeholder="Specializes in cultural tours, heritage walks..."
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={addGuideProfile}
                        disabled={!guideProfileInput.name.trim()}
                      >
                        Add Guide Profile
                      </Button>
                    </Grid>
                  </Grid>
                </Card>

                {/* Existing Profiles */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {formData.tourGuideProfiles.map((profile, idx) => (
                    <Card key={idx} variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: "flex", gap: 2 }}>
                        {profile.profilePic && (
                          <Box
                            component="img"
                            src={profile.profilePic}
                            alt={profile.name}
                            sx={{
                              width: 80,
                              height: 80,
                              objectFit: "cover",
                              borderRadius: 1,
                              flexShrink: 0,
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        )}
                        <Box sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {profile.name}
                              </Typography>
                              {profile.experience && (
                                <Typography variant="body2" color="text.secondary">
                                  {profile.experience}
                                </Typography>
                              )}
                            </Box>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeGuideProfile(idx)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                          {profile.description && (
                            <Typography variant="body2" color="text.secondary">
                              {profile.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Card>
                  ))}
                  {formData.tourGuideProfiles.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
                      No tour guide profiles added yet.
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Submit Button */}
          <Grid item xs={12}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                component={Link}
                href="/dashboard/tour-managers"
                variant="outlined"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                disabled={loading}
              >
                {loading ? "Saving..." : isEdit ? "Update" : "Create"} Tour Manager
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
}
