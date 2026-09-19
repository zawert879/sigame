import { Spin, UploadProps } from "antd";
import { Upload } from "antd";
import React, { useState } from "react";
import { CloudUploadOutlined, LoadingOutlined } from "@ant-design/icons";
import usePacksStore from "@/store/packs";
import { adminApiUrl, httpErrorMessage } from "@/utils/api";
import { notifyError, notifyErrorText, notifySuccess } from "@/utils/notify";

const { Dragger } = Upload;

enum Statuses {
  Ready,
  Uploading,
}

const uploadErrorStatus = (error: unknown): number => {
  const status = (error as { status?: unknown } | undefined)?.status
  return typeof status === 'number' ? status : 0
}

export const UploadPack: React.FC = () => {
  const { fetchPacks } = usePacksStore()
  const [status, setStatus] = useState<Statuses>(Statuses.Ready)

  const props: UploadProps = {
    name: "file",
    accept: '.siq',
    action: adminApiUrl('/api/upload'),
    multiple: true,
    async onChange(info) {
      const { status } = info.file;
      if (status === 'removed') {
        setStatus(Statuses.Ready)
      }
      if (status === 'uploading') {
        setStatus(Statuses.Uploading)
      }
      if (status === 'done') {
        setStatus(Statuses.Ready)
        notifySuccess(`Пак «${info.file.name}» загружен`);
        try {
          await fetchPacks()
        } catch (error) {
          notifyError(error, 'Не удалось обновить список паков')
        }
      } else if (status === 'error') {
        setStatus(Statuses.Ready)
        notifyErrorText(`Не удалось загрузить «${info.file.name}»: ${httpErrorMessage(uploadErrorStatus(info.file.error))}`);
      }
    },
  };
  return (
    <Dragger height={160} {...props}>
      <p className="ant-upload-drag-icon">
        {status === Statuses.Ready && <CloudUploadOutlined />}
        {status === Statuses.Uploading && <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />}
      </p>
      <p className="ant-upload-text px-2">
        Кликните или перетащите siq файл
      </p>
      <p className="ant-upload-hint px-2">
        Можно выбрать несколько паков .siq сразу
      </p>
    </Dragger>
  );
};
