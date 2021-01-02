﻿using anime_dl.Ext;
using anime_dl.Video.Constructs;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace anime_dl.Video.Extractors
{
    class HAnime : ExtractorBase
    {
        public HAnime(string term, bool mt = false, string path = null, bool continuos = false)
        {
            downloadTo = path;
            if (term.IsValidUri())
                Download(term, mt, continuos);
            else
                Download(Search(term), mt, continuos);
        }

        private bool ExtractDataFromVideo()
        {
            return false;
        }

        public override bool Download(string path, bool mt, bool continuos)
        {
            GetDownloadUri(videoInfo == null ? new HentaiVideo { slug = path } : videoInfo.hentai_video);
            if (downloadTo == null)
                downloadTo = $"{Directory.GetCurrentDirectory()}\\HAnime\\{videoInfo.hentai_video.name}\\";

            Directory.CreateDirectory(downloadTo);


            string[] manifestContent = webClient.DownloadString(rootObj.linkToManifest).Split(new string[] { "\r", "\r\n", "\n" }, StringSplitOptions.None);
            
            int part = 0;
            int length = (manifestContent.Length / 2) - 3;

            for(int idx = 0; idx < manifestContent.Length; idx++)
            {
                if (manifestContent[idx][0] == '#')
                    continue;

                Console.WriteLine($"Downloading Part {part} of {length} for {videoInfo.hentai_video.name}");
                Byte[] b = webClient.DownloadData(manifestContent[idx]);
                mergeToMain(downloadTo + videoInfo.hentai_video.name, decodePartAES128(b, "0123456701234567", part++));
            }

            if (continuos && videoInfo.next_hentai_video.name.RemoveSpecialCharacters().TrimIntegrals() == videoInfo.hentai_video.name.TrimIntegrals())
            {
                HAnime h = new HAnime($"https://hanime.tv/videos/hentai/{videoInfo.next_hentai_video.slug}", mt, downloadTo, continuos);
            }

            return true;
        }

        private static Byte[] decodePartAES128(Byte[] data, string key, int sequence)
        {
            byte[] iv = sequence.ToBigEndianBytes();
            iv = new byte[8].Concat(iv).ToArray();

            // HLS uses AES-128 w/ CBC & PKCS7
            RijndaelManaged algorithm = new RijndaelManaged()
            {
                Padding = PaddingMode.PKCS7,
                Mode = CipherMode.CBC,
                KeySize = 128,
                BlockSize = 128
            };

            algorithm.Key = Encoding.ASCII.GetBytes(key);
            algorithm.IV = iv;

            Byte[] bytes;

            using (MemoryStream ms = new MemoryStream())
            {
                using (CryptoStream cs = new CryptoStream(ms, algorithm.CreateDecryptor(), CryptoStreamMode.Write))
                    cs.Write(data, 0, data.Length);
                bytes = ms.ToArray();
            }

            GC.Collect();

            return bytes;
        }

        public override void GenerateHeaders()
        {
            throw new NotImplementedException();
        }

        public override string GetDownloadUri(string path)
        {
            Console.WriteLine("Extracting Download URL for {0}", path);
            string Data = webClient.DownloadString(path);

            Regex reg = new Regex("(?<=<script>window\\.__NUXT__=)(.*)(?=;</script>)");
            Match mc = reg.Match(Data); // Grab json
            // Make it "parsable"
            string a = mc.Value;
            rootObj = JsonSerializer.Deserialize<Root>(a);
            rootObj.state.data.video.hentai_video.name = rootObj.state.data.video.hentai_video.name.RemoveSpecialCharacters();
            rootObj.linkToManifest = $"https://weeb.hanime.tv/weeb-api-cache/api/v8/m3u8s/{rootObj.state.data.video.videos_manifest.servers[0].streams[0].id.ToString()}.m3u8";
            videoInfo.hentai_video = rootObj.state.data.video.hentai_video;
            Console.WriteLine($"https://weeb.hanime.tv/weeb-api-cache/api/v8/m3u8s/{rootObj.state.data.video.videos_manifest.servers[0].streams[0].id.ToString()}.m3u8");
            return $"https://weeb.hanime.tv/weeb-api-cache/api/v8/m3u8s/{rootObj.state.data.video.videos_manifest.servers[0].streams[0].id.ToString()}.m3u8";
        }

        public override string Search(string name)
        {
            int np = 0;
            string a;
        a:
            try
            {
                HttpWebRequest httpWebRequest = (HttpWebRequest)WebRequest.Create("https://search.htv-services.com/");
                httpWebRequest.ContentType = "application/json";
                httpWebRequest.Method = "POST";

                string json = $"{{\"search_text\":\"{name}\",\"tags\":[],\"tags_mode\":\"AND\",\"brands\":[],\"blacklist\":[],\"order_by\":\"released_at_unix\",\"ordering\":\"asc\",\"page\":{np.ToString()}}}";

                using (StreamWriter sw = new StreamWriter(httpWebRequest.GetRequestStream()))
                    sw.Write(json);

                HttpWebResponse response = (HttpWebResponse)httpWebRequest.GetResponse();

                using (StreamReader sr = new StreamReader(response.GetResponseStream()))
                    a = sr.ReadToEnd();

                SearchReq sj = JsonSerializer.Deserialize<SearchReq>(a);

                Console.WriteLine($"Hits: {sj.actualHits.Count} {np}/{sj.nbPages} page");

                for (int idx = 0; idx < sj.actualHits.Count; idx++)
                    Console.WriteLine($"{idx} -- {sj.actualHits[idx].name} | Ratings: {sj.actualHits[idx].GetRating()}/10\n       tags:{sj.actualHits[idx].tagsAsString()}\n       desc:{new string(sj.actualHits[idx].description.Replace("<p>", string.Empty).Replace("</p>", string.Empty).Replace("\n", string.Empty).Take(60).ToArray())}\n\n");

                Console.WriteLine($"\nCommands: \n     page {{page}}/{sj.nbPages}\n     select {{episode num}}");
            c:
                Console.Write("$: ");
                String[] input = Console.ReadLine().ToLower().Split(' ');

                switch (input[0])
                {
                    case "select":
                        videoInfo = new Constructs.Video() { hentai_video = new HentaiVideo() { slug = $"https://hanime.tv/videos/hentai/{sj.actualHits[int.Parse(input[1])].slug}"} };
                        return $"https://hanime.tv/videos/hentai/{sj.actualHits[int.Parse(input[1])].slug}";
                    case "page":
                        Console.Clear();
                        np = int.Parse(input[1]);
                        goto a;
                    default:
                        goto c;
                }
            }
            catch
            {
                goto a;
            }
        }

        public override string GetDownloadUri(HentaiVideo vid)
        {
            Console.WriteLine("Extracting Download URL for {0}", vid.slug);
            string Data = webClient.DownloadString(vid.slug);

            Regex reg = new Regex("(?<=<script>window\\.__NUXT__=)(.*)(?=;</script>)");
            Match mc = reg.Match(Data); // Grab json
            // Make it "parsable"
            string a = mc.Value;
            rootObj = JsonSerializer.Deserialize<Root>(a);
            rootObj.state.data.video.hentai_video.name = rootObj.state.data.video.hentai_video.name.RemoveSpecialCharacters();
            rootObj.linkToManifest = $"https://weeb.hanime.tv/weeb-api-cache/api/v8/m3u8s/{rootObj.state.data.video.videos_manifest.servers[0].streams[0].id.ToString()}.m3u8";
            vid.slug = rootObj.linkToManifest;
            if (videoInfo == null)
                videoInfo = rootObj.state.data.video;
            else
                videoInfo.hentai_video = rootObj.state.data.video.hentai_video;
            return vid.slug;
        }
    }
}