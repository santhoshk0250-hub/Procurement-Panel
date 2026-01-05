"use client";

import React from "react";
import Link from "next/link";
import {
  Box,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  Stack,
  Typography,
  Button,
} from "@mui/material";
import type { ChipProps } from "@mui/material/Chip";

export type ServiceChip = {
  label: string;
  icon?: React.ReactElement;
  color?: ChipProps["color"];
  variant?: ChipProps["variant"];
  sx?: any;
};

export type CommonServiceCardProps = {
  id: string;
  title: string;
  image: string;

  subtitleChip?: ServiceChip;
  topLeftChips?: ServiceChip[];
  topRightChips?: ServiceChip[];

  description?: string;
  descriptionHtml?: string;

  metaChips?: ServiceChip[];
  footerRightText?: string;

  editHref?: string;
  onEdit?: () => void;
  onDelete?: () => void;

  min_pax?: number;
  max_pax?: number;
  total_days?: number;
  total_nights?: number;
  packageDescription?: string;
  isCustomizable?: boolean;
  markup_price_mode?: "min" | "max" | "both" | string;

  extraActions?: React.ReactNode;
};

const chipBaseSx = {
  borderRadius: 999,
  fontWeight: 600,
  fontSize: 12,
  height: 24,
  "& .MuiChip-label": { px: 0.8 },
  "& .MuiChip-icon": { ml: 0.6, mr: -0.2 },
};

const topOverlaySx = {
  px: 0.6,
  py: 0.5,
  borderRadius: 999,
  bgcolor: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.55)",
  boxShadow: "0 6px 14px rgba(0,0,0,0.12)",
};

const CommonServiceCard: React.FC<CommonServiceCardProps> = ({
  title,
  image,
  subtitleChip,
  topLeftChips = [],
  topRightChips = [],
  description,
  descriptionHtml,
  metaChips = [],
  footerRightText,
  editHref,
  onEdit,
  onDelete,
  extraActions,
}) => {
  return (
    <Card
      sx={{
        width: "100%",
        maxWidth: 460,
        mx: "auto",
        borderRadius: 3,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 8px 22px rgba(18, 38, 63, 0.08)",
        transition: "160ms ease",
        "&:hover": {
          boxShadow: "0 12px 28px rgba(18, 38, 63, 0.12)",
          borderColor: "rgba(25, 118, 210, 0.35)",
          transform: "translateY(-1px)",
        },
      }}
    >
      <Box sx={{ position: "relative" }}>
        <CardMedia
          component="img"
          image={image}
          alt={title}
          sx={{
            objectFit: "cover",
            width: "100%",
            height: { xs: 190, sm: 175, md: 170 },
          }}
        />

        {/* TOP LEFT CHIPS */}
        {!!topLeftChips.length && (
          <Box
            sx={{
              position: "absolute",
              left: 10,
              top: 10,
              display: "flex",
              alignItems: "center",
              gap: 0.6,
              flexWrap: "wrap",
              maxWidth: "calc(100% - 20px)",
              ...topOverlaySx,
            }}
          >
            {topLeftChips.map((c, idx) => {
              // keep customizable readable but not too loud
              const isCustom =
                typeof c.label === "string" &&
                c.label.toLowerCase().includes("customizable");

              return (
                <Chip
                  key={idx}
                  size="small"
                  icon={c.icon}
                  label={c.label}
                  color={isCustom ? "success" : c.color ?? "default"}
                  variant={isCustom ? "filled" : c.variant ?? "filled"}
                  sx={{
                    ...chipBaseSx,
                    ...(isCustom
                      ? {
                          bgcolor: "rgba(46, 125, 50, 0.92)",
                          color: "common.white",
                          "& .MuiChip-icon": { color: "common.white" },
                        }
                      : {
                          bgcolor: "rgba(255,255,255,0.9)",
                          color: "text.primary",
                        }),
                    ...c.sx,
                  }}
                />
              );
            })}
          </Box>
        )}

        {/* TOP RIGHT CHIPS */}
        {!!topRightChips.length && (
          <Box
            sx={{
              position: "absolute",
              right: 10,
              bottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 0.6,
              ...topOverlaySx,
            }}
          >
            {topRightChips.map((c, idx) => (
              <Chip
                key={idx}
                size="small"
                icon={c.icon}
                label={c.label}
                color={c.color ?? "default"}
                variant={c.variant ?? "filled"}
                sx={{
                  ...chipBaseSx,
                  bgcolor: "rgba(255,255,255,0.9)",
                  color: "text.primary",
                  ...c.sx,
                }}
              />
            ))}
          </Box>
        )}
      </Box>

      <CardContent sx={{ pb: 1, px: { xs: 1.75, sm: 2 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography
            sx={{
              fontSize: { xs: "1.02rem", sm: "1.1rem" },
              fontWeight: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
            title={title}
          >
            {title}
          </Typography>

          {subtitleChip && (
            <Chip
              size="small"
              icon={subtitleChip.icon}
              label={subtitleChip.label}
              color={subtitleChip.color ?? "default"}
              variant={subtitleChip.variant ?? "outlined"}
              sx={{
                ...chipBaseSx,
                height: 24,
                fontWeight: 600,
                bgcolor: "background.paper",
                ...subtitleChip.sx,
              }}
            />
          )}
        </Stack>

        {/* Description (HTML or text) */}
        {!!descriptionHtml ? (
          <Typography
            variant="body2"
            color="text.secondary"
            mt={1}
            sx={{
              fontSize: 13,
              lineHeight: 1.45,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            mt={1}
            sx={{
              fontSize: 13,
              lineHeight: 1.45,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            title={description}
          >
            {description || "—"}
          </Typography>
        )}

        {!!metaChips.length && (
          <Stack
            direction="row"
            spacing={0.75}
            flexWrap="wrap"
            mt={1}
            sx={{ gap: 0.75 }}
          >
            {metaChips.map((c, idx) => (
              <Chip
                key={idx}
                size="small"
                icon={c.icon}
                label={c.label}
                color={c.color ?? "default"}
                variant={c.variant ?? "outlined"}
                sx={{
                  ...chipBaseSx,
                  bgcolor: "rgba(0,0,0,0.02)",
                  borderColor: "rgba(0,0,0,0.10)",
                  ...c.sx,
                }}
              />
            ))}
          </Stack>
        )}
      </CardContent>

      <CardActions
        sx={{
          justifyContent: "space-between",
          px: { xs: 1.75, sm: 2 },
          pb: { xs: 1.5, sm: 2 },
          pt: 0.5,
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          gap: { xs: 1, sm: 0 },
        }}
      >
        <Stack direction="row" spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
          {(editHref || onEdit) && (
            <Button
              component={editHref ? (Link as any) : "button"}
              href={editHref as any}
              onClick={onEdit}
              size="small"
              variant="outlined"
              sx={{
                flex: { xs: 1, sm: "initial" },
                borderRadius: 2,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              Edit
            </Button>
          )}

          {onDelete && (
            <Button
              color="error"
              size="small"
              variant="outlined"
              sx={{
                flex: { xs: 1, sm: "initial" },
                borderRadius: 2,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
              onClick={onDelete}
            >
              Delete
            </Button>
          )}

          {extraActions}
        </Stack>

        {!!footerRightText && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textAlign: { xs: "center", sm: "right" } }}
          >
            {footerRightText}
          </Typography>
        )}
      </CardActions>
    </Card>
  );
};

export default CommonServiceCard;
