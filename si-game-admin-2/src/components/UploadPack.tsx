import { message, Spin, UploadProps } from "antd/lib";
import { Upload } from "antd/lib";
import React, { useState } from "react";
import { CloudUploadOutlined, LoadingOutlined } from "@ant-design/icons/lib";
import usePacksStore from "@/store/packs";

const { Dragger } = Upload;

enum Statuses {
  Ready,
  Uploading,
}

export const UploadPack: React.FC = () => {
  const { fetchPacks } = usePacksStore()
  const [status, setStatus] = useState<Statuses>(Statuses.Ready)

  const props: UploadProps = {
    name: "file",
    accept: '.siq',
    action: '/api/upload',
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
        await fetchPacks()
        setStatus(Statuses.Ready)
        message.success(`${info.file.name} file uploaded successfully.`);
        
      } else if (status === 'error') {
        setStatus(Statuses.Ready)
        message.error(`${info.file.name} file upload failed.`);
      }
    },
  };
  return (
      <div className="w-full min-h-[200px] border-2 border-gray-200 rounded-2xl p-4 backdrop-blur-sm bg-white">
          <Dragger height={200} {...props}>
            <p className="ant-upload-drag-icon">
              {
                status === Statuses.Ready && ( <CloudUploadOutlined />)
              }
              {
                status === Statuses.Uploading && ( <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />)
              }
            </p>
            <p className="ant-upload-text">
              Кликните или перетащите siq фаил
            </p>
            <p className="ant-upload-hint">
              Support for a single upload. Strictly prohibited from
              uploading company data or other banned files.
            </p>
          </Dragger>
        </div>
  );
};
