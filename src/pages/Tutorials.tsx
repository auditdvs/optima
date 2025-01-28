import React from 'react';
import { TutorialCard } from '../components/TutorialCard';
import { Layout } from '../components/Layout';

const tutorials = [
  {
    title: "Tutorial THC",
    description: "Cara mengolah THC menggunakan menu Pengolahan THC.",
    url: "https://docs.google.com/uc?export=download&id=1Tsy8Tg8Xx4nVOGG1DyxcOVO_GHIOPf74"
  },
  {
    title: "Tutorial Olah THC Manual",
    description: "Pengolahan THC secara manual dengan excel.",
    url: "https://docs.google.com/uc?export=download&id=1HzV2ZHKOGMFHg9DGhr_W1Vg8EoL5DObU"
  },
  {
    title: "Tutorial Setting Edge",
    description: "Cara atur ulang edge untuk membuka MDIS.",
    url: "https://docs.google.com/uc?export=download&id=1HRRpcwsrCAD4RTziFmcHm_OMg0Vk_6mp"
  },
  {
    title: "Tutorial Format Data",
    description: "Memindahkan data dari menu ke-6 Pengolahan THC.",
    url: "https://docs.google.com/uc?export=download&id=1vI3YGzV-ghESw-_Jtzreydhx_VE16pLn"
  },
  {
    title: "Tutorial THC Pinjaman",
    description: "Pembuatan THC Pinjaman, didalam tools sudah tersedia kriteria yang di gunakan apa saja.",
    url: "https://docs.google.com/uc?export=download&id=1WOVOK4rj6g1BhJdDTLOUnXWmxZZeyJjD"
  },
  {
    title: "Tutorial Analisa Anomali",
    description: "Penggunaan modul analisa anomali keseluruhan.",
    url: "https://docs.google.com/uc?export=download&id=1woc7ECpSd07cxNd264VpACnpQprzsurv"
  }
];

export default function Tutorials() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tutorials</h1>
        <p className="text-gray-600">Download tutorial documents for various features</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tutorials.map((tutorial, index) => (
          <TutorialCard
            key={index}
            title={tutorial.title}
            description={tutorial.description}
            url={tutorial.url}
          />
        ))}
      </div>
    </div>
  );
}